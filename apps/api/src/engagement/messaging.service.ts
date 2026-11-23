import {
  Injectable,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import {
  messagingWebhookReceipts,
  outboundMessageJobs,
  marketingSubscriptions,
  marketingSuppressions,
  eq,
  and,
  sql,
} from '@gulf/database';
import type { StaffSession } from '../auth/auth.types';
import { EngagementService } from './engagement.service';
import { SubscriptionsService } from './subscriptions.service';
import { digest } from './security';
import { parse, id } from './contracts';
export interface WhatsAppProvider {
  readonly name: string;
  sendTemplate(): Promise<never>;
}
export class DisabledWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'disabled';
  async sendTemplate(): Promise<never> {
    throw new ServiceUnavailableException(
      'Official outbound messaging is not enabled',
    );
  }
}
@Injectable()
export class MessagingService {
  readonly provider: WhatsAppProvider = new DisabledWhatsAppProvider();
  constructor(
    private readonly engagement: EngagementService,
    private readonly subscriptions: SubscriptionsService,
  ) {}
  health() {
    const e = this.engagement.env;
    return {
      provider: 'disabled',
      outboundEnabled: false,
      credentialsPresent: Boolean(
        e.META_ACCESS_TOKEN && e.META_PHONE_NUMBER_ID,
      ),
      webhookConfigured: Boolean(
        e.META_APP_SECRET && e.META_WEBHOOK_VERIFY_TOKEN,
      ),
      dailyMessageLimit: 0,
      dailyBudgetMinor: 0,
      requiresApprovedTemplate: true,
      requiresSuperAdminApproval: true,
      restriction:
        'No marketing messages are sent by this release. Healthcare/product advertising requires separate current policy and regulatory clearance.',
    };
  }
  async preview(session: StaffSession, input: unknown) {
    const d = parse(
      z
        .object({
          subscriptionId: id,
          campaignId: id,
          templateName: z.string().regex(/^[a-z0-9_]{1,160}$/),
          superAdminApproval: z.literal(true),
        })
        .strict(),
      input,
    );
    const e = this.engagement;
    await e.database.db.transaction(async (tx) => {
      const u = await e.access.actor(tx, session, ['SUPER_ADMIN']);
      await e.access.audit(
        tx,
        u,
        'outbound_eligibility_checked',
        d.campaignId,
        { templateName: d.templateName },
      );
    });
    const eligibility = await this.subscriptions.eligibility(
      d.subscriptionId,
      d.campaignId,
    );
    return {
      ...eligibility,
      outboundEnabled: false,
      queued: false,
      sent: false,
      provider: 'disabled',
      approvedTemplateVerified: false,
      budgetAvailable: false,
    };
  }
  challenge(query: Record<string, unknown>) {
    const e = this.engagement.env;
    if (
      !e.META_WEBHOOK_VERIFY_TOKEN ||
      query['hub.mode'] !== 'subscribe' ||
      typeof query['hub.verify_token'] !== 'string' ||
      digest(query['hub.verify_token']) !== digest(e.META_WEBHOOK_VERIFY_TOKEN)
    )
      throw new ForbiddenException('Webhook verification failed');
    return parse(
      z.string().regex(/^[a-zA-Z0-9_-]{1,200}$/),
      query['hub.challenge'],
    );
  }
  async webhook(raw: Buffer | undefined, signature: unknown) {
    const e = this.engagement;
    if (
      !e.env.META_APP_SECRET ||
      !raw ||
      typeof signature !== 'string' ||
      !/^sha256=[a-f0-9]{64}$/.test(signature)
    )
      throw new ForbiddenException('Invalid webhook signature');
    const expected = createHmac('sha256', e.env.META_APP_SECRET)
      .update(raw)
      .digest('hex');
    if (
      !timingSafeEqual(Buffer.from(expected), Buffer.from(signature.slice(7)))
    )
      throw new ForbiddenException('Invalid webhook signature');
    const payload = parse(
      z
        .object({
          object: z.literal('whatsapp_business_account'),
          entry: z
            .array(
              z
                .object({
                  changes: z
                    .array(
                      z
                        .object({
                          value: z
                            .object({
                              statuses: z
                                .array(
                                  z
                                    .object({
                                      id: z.string().max(200),
                                      status: z.enum([
                                        'sent',
                                        'delivered',
                                        'read',
                                        'failed',
                                      ]),
                                    })
                                    .passthrough(),
                                )
                                .max(100)
                                .optional(),
                              messages: z
                                .array(
                                  z
                                    .object({
                                      from: z.string().regex(/^\d{8,15}$/),
                                      text: z
                                        .object({ body: z.string().max(1000) })
                                        .optional(),
                                    })
                                    .passthrough(),
                                )
                                .max(100)
                                .optional(),
                            })
                            .passthrough(),
                        })
                        .passthrough(),
                    )
                    .max(20),
                })
                .passthrough(),
            )
            .max(20),
        })
        .passthrough(),
      JSON.parse(raw.toString()),
    );
    const receipt = digest(raw.toString());
    return e.database.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(messagingWebhookReceipts)
        .values({ id: receipt })
        .onConflictDoNothing()
        .returning();
      if (!inserted.length) return { accepted: true, duplicate: true };
      for (const entry of payload.entry)
        for (const change of entry.changes) {
          for (const status of change.value.statuses ?? []) {
            const state = status.status.toUpperCase();
            await tx
              .update(outboundMessageJobs)
              .set({ state })
              .where(
                and(
                  eq(outboundMessageJobs.providerMessageId, status.id),
                  sql`${outboundMessageJobs.state}<>'SUPPRESSED'`,
                ),
              );
          }
          for (const message of change.value.messages ?? []) {
            if (
              !/^(stop|unsubscribe|cancel|الغاء|إلغاء|توقف)$/i.test(
                message.text?.body.trim() ?? '',
              )
            )
              continue;
            const phoneHash = e.security.hash('phone:+' + message.from);
            const matches = await tx
              .select()
              .from(marketingSubscriptions)
              .where(eq(marketingSubscriptions.contactHash, phoneHash))
              .for('update');
            for (const sub of matches) {
              await tx
                .update(marketingSubscriptions)
                .set({ state: 'WITHDRAWN' })
                .where(eq(marketingSubscriptions.id, sub.id));
              await tx
                .insert(marketingSuppressions)
                .values({
                  branchId: sub.branchId,
                  contactHash: sub.contactHash,
                  reason: 'OFFICIAL_WEBHOOK_OPTOUT',
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
              await e.access.audit(tx, null, 'webhook_optout', sub.id);
            }
          }
        }
      return { accepted: true, duplicate: false };
    });
  }
}
