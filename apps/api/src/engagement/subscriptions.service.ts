import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { Request } from 'express';
import { CONSENT_VERSION } from '@gulf/shared';
import {
  marketingSubscriptions as subscriptions,
  subscriptionRequests as requests,
  marketingConsents as consents,
  marketingSuppressions as suppressions,
  marketingCampaigns as campaigns,
  outboundMessageJobs,
  marketingEvents,
  assistantFeedback,
  messagingWebhookReceipts,
  eq,
  and,
  sql,
  desc,
} from '@gulf/database';
import type { StaffSession } from '../auth/auth.types';
import { EngagementService } from './engagement.service';
import { subscriptionInput, tokenInput, parse, id } from './contracts';
import { digest } from './security';
@Injectable()
export class SubscriptionsService {
  constructor(private readonly engagement: EngagementService) {}
  async request(input: unknown, req: Request) {
    const data = parse(subscriptionInput, input);
    const e = this.engagement;
    await e.security.limit(req.ip ?? '', 'optin', 5, 3600);
    const branch = await e.publishedBranch(data.branchSlug);
    let qrId: string | null = null;
    if (data.qrCode) {
      const qr = await e.publicQr(data.qrCode);
      if (qr.branch.id !== branch.id)
        throw new ForbiddenException('QR branch mismatch');
      const { qrCampaigns } = await import('@gulf/database');
      const [row] = await e.database.db
        .select()
        .from(qrCampaigns)
        .where(eq(qrCampaigns.code, qr.code));
      qrId = row.id;
    }
    const code = randomBytes(8).toString('hex'),
      token = randomBytes(32).toString('hex'),
      hash = e.security.hash('phone:' + data.phone),
      cipher = e.security.encrypt(data.phone),
      expiresAt = new Date(Date.now() + 24 * 3600000);
    const request = await e.database.db.transaction(async (tx) => {
      const [sub] = await tx
        .insert(subscriptions)
        .values({
          branchId: branch.id,
          contactHash: hash,
          contactCipher: cipher,
        })
        .onConflictDoUpdate({
          target: [subscriptions.branchId, subscriptions.contactHash],
          set: { contactCipher: cipher },
        })
        .returning();
      const [ticket] = await tx
        .insert(requests)
        .values({
          subscriptionId: sub.id,
          codeHash: digest(code),
          manageHash: digest(token),
          locale: data.locale,
          scopes: [...new Set(data.scopes)],
          consentVersion: CONSENT_VERSION,
          source: qrId ? 'QR' : 'WEBSITE',
          qrId,
          expiresAt,
        })
        .returning();
      return ticket;
    });
    const url = new URL(branch.whatsappUrl);
    url.searchParams.set(
      'text',
      (data.locale === 'ar'
        ? 'أؤكد طلبي الاختياري لتحديثات صيدلية الخليج. رمز التأكيد: '
        : 'I confirm my voluntary Gulf Pharmacy updates request. Confirmation code: ') +
        code,
    );
    return {
      requestId: request.id,
      managementToken: token,
      confirmationCode: code,
      expiresAt: expiresAt.toISOString(),
      state: 'PENDING',
      whatsappUrl: url.toString(),
    };
  }
  private async ticket(input: unknown) {
    const data = parse(tokenInput, input);
    const [ticket] = await this.engagement.database.db
      .select()
      .from(requests)
      .where(eq(requests.id, data.requestId));
    if (
      !ticket ||
      !timingSafeEqual(
        Buffer.from(ticket.manageHash),
        Buffer.from(digest(data.managementToken)),
      )
    )
      throw new NotFoundException('Private management link not found');
    return ticket;
  }
  async state(input: unknown) {
    const ticket = await this.ticket(input);
    return {
      state:
        ticket.status === 'PENDING' && ticket.expiresAt <= new Date()
          ? 'EXPIRED'
          : ticket.status,
      confirmed: ticket.status === 'CONFIRMED',
      expiresAt: ticket.expiresAt,
    };
  }
  async withdraw(input: unknown) {
    const ticket = await this.ticket(input);
    const e = this.engagement;
    return e.database.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(requests)
        .where(eq(requests.id, ticket.id))
        .for('update');
      if (current.status === 'WITHDRAWN') return { state: 'WITHDRAWN' };
      await tx
        .update(requests)
        .set({ status: 'WITHDRAWN' })
        .where(eq(requests.id, current.id));
      if (current.status === 'CONFIRMED') {
        const [sub] = await tx
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.id, current.subscriptionId))
          .for('update');
        await tx
          .update(subscriptions)
          .set({ state: 'WITHDRAWN' })
          .where(eq(subscriptions.id, sub.id));
        await tx
          .insert(suppressions)
          .values({
            branchId: sub.branchId,
            contactHash: sub.contactHash,
            reason: 'CUSTOMER_WITHDRAWAL',
          })
          .onConflictDoNothing();
        await tx
          .insert(consents)
          .values({
            subscriptionId: sub.id,
            requestId: current.id,
            kind: 'WITHDRAWN',
            version: current.consentVersion,
            locale: current.locale,
            scopes: current.scopes,
            source: 'PRIVATE_MANAGEMENT_LINK',
          })
          .onConflictDoNothing();
        await tx
          .update(outboundMessageJobs)
          .set({ state: 'SUPPRESSED' })
          .where(
            and(
              eq(outboundMessageJobs.subscriptionId, sub.id),
              sql`${outboundMessageJobs.state} IN ('DISABLED','QUEUED')`,
            ),
          );
      }
      return { state: 'WITHDRAWN' };
    });
  }
  list(session: StaffSession) {
    const e = this.engagement;
    return e.database.db.transaction(async (tx) => {
      const u = await e.access.actor(tx, session, [
        'SUPER_ADMIN',
        'BRANCH_ADMIN',
      ]);
      const rows = await tx
        .select({ ticket: requests, subscription: subscriptions })
        .from(requests)
        .innerJoin(subscriptions, eq(subscriptions.id, requests.subscriptionId))
        .where(
          u.role === 'SUPER_ADMIN'
            ? undefined
            : sql`EXISTS (SELECT 1 FROM branch_memberships m WHERE m.user_id=${u.id} AND m.branch_id=${subscriptions.branchId})`,
        )
        .orderBy(desc(requests.createdAt))
        .limit(100);
      return rows.map(({ ticket: t, subscription: s }) => ({
        id: t.id,
        subscriptionId: s.id,
        branchId: s.branchId,
        state:
          t.status === 'PENDING' && t.expiresAt <= new Date()
            ? 'EXPIRED'
            : t.status,
        contactMasked: s.contactCipher
          ? '•••• ' + e.security.decrypt(s.contactCipher).slice(-4)
          : 'Removed',
        confirmed: s.state === 'CONFIRMED',
        scopes: t.scopes,
        locale: t.locale,
        createdAt: t.createdAt,
        expiresAt: t.expiresAt,
      }));
    });
  }
  confirm(session: StaffSession, requestId: string, input: unknown) {
    parse(id, requestId);
    const data = parse(
      z
        .object({
          receivedFromPhone: z.string().regex(/^\+9665\d{8}$/),
          confirmationCode: z.string().regex(/^[a-f0-9]{16}$/),
          verifiedOfficialInbound: z.literal(true),
        })
        .strict(),
      input,
    );
    const e = this.engagement;
    return e.database.db.transaction(async (tx) => {
      const u = await e.access.actor(tx, session, [
        'SUPER_ADMIN',
        'BRANCH_ADMIN',
      ]);
      const [ticket] = await tx
        .select()
        .from(requests)
        .where(eq(requests.id, requestId))
        .for('update');
      if (!ticket) throw new NotFoundException('Request not found');
      const [sub] = await tx
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.id, ticket.subscriptionId))
        .for('update');
      await e.access.branch(tx, u, sub.branchId);
      if (ticket.status === 'CONFIRMED') return { state: 'CONFIRMED' };
      if (ticket.status !== 'PENDING' || ticket.expiresAt <= new Date())
        throw new ConflictException(
          'Confirmation request is expired or withdrawn',
        );
      if (
        digest(data.confirmationCode) !== ticket.codeHash ||
        e.security.hash('phone:' + data.receivedFromPhone) !== sub.contactHash
      )
        throw new ForbiddenException(
          'The actual incoming WhatsApp sender and confirmation code must both match',
        );
      await tx
        .update(requests)
        .set({ status: 'CONFIRMED' })
        .where(eq(requests.id, ticket.id));
      await tx
        .update(subscriptions)
        .set({ state: 'CONFIRMED', confirmedAt: new Date() })
        .where(eq(subscriptions.id, sub.id));
      await tx
        .delete(suppressions)
        .where(
          and(
            eq(suppressions.branchId, sub.branchId),
            eq(suppressions.contactHash, sub.contactHash),
          ),
        );
      await tx
        .insert(consents)
        .values({
          subscriptionId: sub.id,
          requestId: ticket.id,
          kind: 'CONFIRMED',
          version: ticket.consentVersion,
          locale: ticket.locale,
          scopes: ticket.scopes,
          source: 'OFFICIAL_WHATSAPP_INBOUND',
          verifiedBy: u.id,
        })
        .onConflictDoNothing();
      await e.access.audit(tx, u, 'subscription_confirmed', sub.id, {
        requestId: ticket.id,
        version: ticket.consentVersion,
      });
      return { state: 'CONFIRMED' };
    });
  }
  suppress(session: StaffSession, subscriptionId: string) {
    parse(id, subscriptionId);
    const e = this.engagement;
    return e.database.db.transaction(async (tx) => {
      const u = await e.access.actor(tx, session, [
        'SUPER_ADMIN',
        'BRANCH_ADMIN',
      ]);
      const [sub] = await tx
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.id, subscriptionId))
        .for('update');
      if (!sub) throw new NotFoundException('Subscription not found');
      await e.access.branch(tx, u, sub.branchId);
      await tx
        .insert(suppressions)
        .values({
          branchId: sub.branchId,
          contactHash: sub.contactHash,
          reason: 'STAFF_RECORDED_OPTOUT',
        })
        .onConflictDoNothing();
      await tx
        .update(subscriptions)
        .set({ state: 'WITHDRAWN' })
        .where(eq(subscriptions.id, sub.id));
      const confirmed = await tx
        .update(requests)
        .set({ status: 'WITHDRAWN' })
        .where(
          and(
            eq(requests.subscriptionId, sub.id),
            eq(requests.status, 'CONFIRMED'),
          ),
        )
        .returning();
      for (const t of confirmed)
        await tx
          .insert(consents)
          .values({
            subscriptionId: sub.id,
            requestId: t.id,
            kind: 'WITHDRAWN',
            version: t.consentVersion,
            locale: t.locale,
            scopes: t.scopes,
            source: 'STAFF_RECORDED_OPTOUT',
            verifiedBy: u.id,
          })
          .onConflictDoNothing();
      await tx
        .update(outboundMessageJobs)
        .set({ state: 'SUPPRESSED' })
        .where(
          and(
            eq(outboundMessageJobs.subscriptionId, sub.id),
            sql`${outboundMessageJobs.state} IN ('DISABLED','QUEUED')`,
          ),
        );
      await e.access.audit(tx, u, 'subscription_suppressed', sub.id);
      return { state: 'WITHDRAWN' };
    });
  }
  async eligibility(subscriptionId: string, campaignId: string) {
    const e = this.engagement;
    const [sub] = await e.database.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId));
    if (!sub || sub.state !== 'CONFIRMED' || !sub.confirmedAt)
      return { eligible: false, reason: 'CONTACT_NOT_CONFIRMED' };
    const [suppressed] = await e.database.db
      .select()
      .from(suppressions)
      .where(
        and(
          eq(suppressions.branchId, sub.branchId),
          eq(suppressions.contactHash, sub.contactHash),
        ),
      );
    if (suppressed) return { eligible: false, reason: 'SUPPRESSED' };
    const [c] = await e.database.db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId));
    if (!c || c.branchId !== sub.branchId)
      return { eligible: false, reason: 'BRANCH_MISMATCH' };
    try {
      await e.publicCampaign(c.slug);
    } catch {
      return { eligible: false, reason: 'CAMPAIGN_NOT_ELIGIBLE' };
    }
    const [consent] = await e.database.db
      .select()
      .from(consents)
      .where(
        and(
          eq(consents.subscriptionId, sub.id),
          eq(consents.kind, 'CONFIRMED'),
        ),
      )
      .orderBy(desc(consents.createdAt))
      .limit(1);
    const scope =
      c.campaignType === 'PROMOTION'
        ? 'PROMOTIONS'
        : c.campaignType === 'EDUCATION'
          ? 'EDUCATION'
          : 'ANNOUNCEMENTS';
    if (!consent?.scopes.includes(scope))
      return { eligible: false, reason: 'TOPIC_NOT_CONSENTED' };
    return { eligible: true, reason: 'OUTBOUND_PROVIDER_DISABLED' };
  }
  async retention(session: StaffSession) {
    const e = this.engagement;
    return e.database.db.transaction(async (tx) => {
      const u = await e.access.actor(tx, session, ['SUPER_ADMIN']);
      const cutoff = new Date(
        Date.now() - e.env.MARKETING_RETENTION_DAYS * 86400000,
      );
      await tx
        .update(requests)
        .set({ status: 'EXPIRED' })
        .where(
          and(eq(requests.status, 'PENDING'), sql`${requests.expiresAt}<now()`),
        );
      const erased = await tx
        .update(subscriptions)
        .set({ contactCipher: null })
        .where(
          and(
            sql`${subscriptions.state}<>'CONFIRMED'`,
            sql`${subscriptions.updatedAt}<${cutoff}`,
          ),
        )
        .returning({ id: subscriptions.id });
      await tx
        .delete(marketingEvents)
        .where(sql`${marketingEvents.createdAt}<${cutoff}`);
      await tx
        .delete(assistantFeedback)
        .where(sql`${assistantFeedback.createdAt}<${cutoff}`);
      await tx
        .delete(messagingWebhookReceipts)
        .where(sql`${messagingWebhookReceipts.createdAt}<${cutoff}`);
      await e.access.audit(tx, u, 'retention_applied', u.id, {
        removedContactCiphers: erased.length,
        retentionDays: e.env.MARKETING_RETENTION_DAYS,
      });
      return {
        removedContactCiphers: erased.length,
        retentionDays: e.env.MARKETING_RETENTION_DAYS,
        consentAndSuppressionEvidenceRetained: true,
      };
    });
  }
}
