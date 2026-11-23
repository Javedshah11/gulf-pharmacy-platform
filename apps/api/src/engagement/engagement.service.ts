import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import QRCode from 'qrcode';
import { z } from 'zod';
import type { Request } from 'express';
import {
  marketingCampaigns as campaigns,
  assistantFaqs as faqs,
  marketingReviews as reviews,
  qrCampaigns as qrs,
  marketingEvents as events,
  healthVideos,
  healthVideoEvents,
  branches,
  staffUsers,
  eq,
  and,
  or,
  sql,
  desc,
  gt,
} from '@gulf/database';
import { DatabaseService } from '../infrastructure/database.service';
import { VideosService } from '../videos/videos.service';
import { ENVIRONMENT, type Environment } from '../config/environment';
import type { StaffSession } from '../auth/auth.types';
import { EngagementAccess, type Tx, type Actor } from './access';
import { EngagementSecurity } from './security';
import {
  campaignInput,
  faqInput,
  qrInput,
  reviewInput,
  contextInput,
  parse,
  id,
  branchSlug,
} from './contracts';
export const safeBranch = (b: typeof branches.$inferSelect) => ({
  id: b.id,
  slug: b.slug,
  nameEn: b.nameEn,
  nameAr: b.nameAr,
  addressEn: b.addressEn,
  addressAr: b.addressAr,
  phone: b.phone,
  whatsappUrl: b.whatsappUrl,
  mapsUrl: b.mapsUrl,
});
type Kind = 'campaigns' | 'faqs';
const draftReset = {
  status: 'DRAFT',
  medicalRevision: null,
  complianceRevision: null,
  approvalReference: null,
  validUntil: null,
};
@Injectable()
export class EngagementService implements OnModuleInit, OnApplicationShutdown {
  private timer?: NodeJS.Timeout;
  private pending = Promise.resolve();
  constructor(
    readonly database: DatabaseService,
    readonly access: EngagementAccess,
    readonly security: EngagementSecurity,
    readonly videos: VideosService,
    @Inject(ENVIRONMENT) readonly env: Environment,
  ) {}
  onModuleInit() {
    if (this.env.NODE_ENV !== 'test' && this.env.DATABASE_URL)
      this.timer = setInterval(() => {
        this.pending = this.pending
          .then(() => this.maintain())
          .catch(() => undefined);
      }, 30000);
  }
  async onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
    await this.pending;
  }
  async maintain() {
    await this.database.db.transaction(async (tx) => {
      const scheduled = await tx
        .select()
        .from(campaigns)
        .where(
          and(
            eq(campaigns.status, 'SCHEDULED'),
            sql`${campaigns.startsAt} <= now()`,
            gt(campaigns.endsAt, new Date()),
          ),
        )
        .for('update');
      for (const c of scheduled) {
        if (
          c.medicalRevision !== c.revision ||
          c.complianceRevision !== c.revision ||
          (c.campaignType === 'PROMOTION' &&
            (!c.approvalReference ||
              !c.validUntil ||
              c.validUntil <= new Date()))
        )
          continue;
        await tx
          .update(campaigns)
          .set({ status: 'ACTIVE' })
          .where(eq(campaigns.id, c.id));
        await this.access.audit(tx, null, 'campaign_activated', c.id);
      }
      const ended = await tx
        .update(campaigns)
        .set({ status: 'COMPLETED' })
        .where(
          and(
            sql`${campaigns.status} IN ('SCHEDULED','ACTIVE','PAUSED')`,
            sql`${campaigns.endsAt} <= now()`,
          ),
        )
        .returning({ id: campaigns.id });
      for (const c of ended)
        await this.access.audit(tx, null, 'campaign_completed', c.id);
    });
  }
  async publishedBranch(slug: string) {
    parse(branchSlug, slug);
    const [b] = await this.database.db
      .select()
      .from(branches)
      .where(
        and(
          eq(branches.slug, slug),
          eq(branches.isActive, true),
          eq(branches.isPublished, true),
        ),
      );
    if (!b) throw new NotFoundException('Published branch not found');
    return b;
  }
  private async videoEligible(
    tx: Tx,
    videoId: string | null,
    branchId: string,
  ) {
    if (!videoId) return null;
    const [v] = await tx
      .select()
      .from(healthVideos)
      .where(eq(healthVideos.id, videoId));
    if (!v) throw new BadRequestException('Video not found');
    if (v.branchId !== branchId && v.visibilityScope !== 'ALL_BRANCHES')
      throw new ForbiddenException('Video is outside this branch');
    const publicVideo = await this.videos.publicDetail(v.slug);
    if (publicVideo.contentKind !== 'GENERAL_EDUCATION')
      throw new BadRequestException('Use a published educational video');
    return v.slug;
  }
  private async content(tx: Tx, u: Actor, kind: Kind, contentId: string) {
    parse(id, contentId);
    const [row] =
      kind === 'campaigns'
        ? await tx
            .select()
            .from(campaigns)
            .where(eq(campaigns.id, contentId))
            .for('update')
        : await tx
            .select()
            .from(faqs)
            .where(eq(faqs.id, contentId))
            .for('update');
    if (!row) throw new NotFoundException('Content not found');
    await this.access.branch(tx, u, row.branchId);
    if (u.role === 'MEDICAL_REVIEWER' && row.reviewerId !== u.id)
      throw new ForbiddenException('This review is not assigned to you');
    if (u.role === 'PHARMACIST' && row.authorId !== u.id)
      throw new ForbiddenException('Only your own proposals are available');
    return row;
  }
  list(session: StaffSession, kind: Kind) {
    return this.database.db.transaction(async (tx) => {
      const u = await this.access.actor(tx, session);
      const table = kind === 'campaigns' ? campaigns : faqs;
      const scope =
        u.role === 'SUPER_ADMIN'
          ? undefined
          : and(
              sql`EXISTS (SELECT 1 FROM branch_memberships m WHERE m.user_id=${u.id} AND m.branch_id=${table.branchId})`,
              u.role === 'MEDICAL_REVIEWER'
                ? eq(table.reviewerId, u.id)
                : u.role === 'PHARMACIST'
                  ? eq(table.authorId, u.id)
                  : undefined,
            );
      return tx
        .select()
        .from(table)
        .where(scope)
        .orderBy(desc(table.updatedAt))
        .limit(100);
    });
  }
  detail(session: StaffSession, kind: Kind, contentId: string) {
    return this.database.db.transaction(async (tx) => {
      const u = await this.access.actor(tx, session);
      const row = await this.content(tx, u, kind, contentId);
      const history = await tx
        .select()
        .from(reviews)
        .where(
          kind === 'campaigns'
            ? eq(reviews.campaignId, row.id)
            : eq(reviews.faqId, row.id),
        )
        .orderBy(desc(reviews.createdAt));
      return { ...row, reviews: history };
    });
  }
  saveCampaign(session: StaffSession, input: unknown, contentId?: string) {
    const data = parse(campaignInput, input);
    return this.database.db.transaction(async (tx) => {
      const u = await this.access.actor(tx, session, [
        'SUPER_ADMIN',
        'BRANCH_ADMIN',
        'PHARMACIST',
      ]);
      await this.access.branch(tx, u, data.branchId);
      const previous = contentId
        ? await this.content(tx, u, 'campaigns', contentId)
        : null;
      if (previous && ['PENDING_REVIEW', 'COMPLETED'].includes(previous.status))
        throw new ConflictException('Content cannot be revised in this state');
      if (previous && previous.branchId !== data.branchId)
        throw new BadRequestException('Source branch cannot change');
      const [used] = await tx
        .select({ id: campaigns.id })
        .from(campaigns)
        .where(eq(campaigns.slug, data.slug));
      if (used && used.id !== contentId)
        throw new ConflictException('Campaign slug is already used');
      await this.videoEligible(tx, data.videoId, data.branchId);
      const value = {
        ...data,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
      };
      const [row] = previous
        ? await tx
            .update(campaigns)
            .set({ ...value, ...draftReset, revision: previous.revision + 1 })
            .where(eq(campaigns.id, previous.id))
            .returning()
        : await tx
            .insert(campaigns)
            .values({ ...value, authorId: u.id })
            .returning();
      await this.access.audit(
        tx,
        u,
        previous ? 'campaign_revised' : 'campaign_created',
        row.id,
        { revision: row.revision },
      );
      return row;
    });
  }
  saveFaq(session: StaffSession, input: unknown, contentId?: string) {
    const data = parse(faqInput, input);
    return this.database.db.transaction(async (tx) => {
      const u = await this.access.actor(tx, session, [
        'SUPER_ADMIN',
        'BRANCH_ADMIN',
        'PHARMACIST',
      ]);
      await this.access.branch(tx, u, data.branchId);
      const previous = contentId
        ? await this.content(tx, u, 'faqs', contentId)
        : null;
      if (previous && ['PENDING_REVIEW', 'ARCHIVED'].includes(previous.status))
        throw new ConflictException('FAQ cannot be revised in this state');
      if (previous && previous.branchId !== data.branchId)
        throw new BadRequestException('Source branch cannot change');
      await this.videoEligible(tx, data.videoId, data.branchId);
      const [row] = previous
        ? await tx
            .update(faqs)
            .set({ ...data, ...draftReset, revision: previous.revision + 1 })
            .where(eq(faqs.id, previous.id))
            .returning()
        : await tx
            .insert(faqs)
            .values({ ...data, authorId: u.id })
            .returning();
      await this.access.audit(
        tx,
        u,
        previous ? 'faq_revised' : 'faq_created',
        row.id,
        { revision: row.revision },
      );
      return row;
    });
  }
  assign(session: StaffSession, kind: Kind, contentId: string, input: unknown) {
    const data = parse(z.object({ reviewerId: id }).strict(), input);
    return this.database.db.transaction(async (tx) => {
      const u = await this.access.actor(tx, session, ['SUPER_ADMIN']);
      const row = await this.content(tx, u, kind, contentId);
      const [reviewer] = await tx
        .select()
        .from(staffUsers)
        .where(
          and(
            eq(staffUsers.id, data.reviewerId),
            eq(staffUsers.role, 'MEDICAL_REVIEWER'),
            eq(staffUsers.isActive, true),
          ),
        );
      if (!reviewer || reviewer.id === row.authorId)
        throw new BadRequestException(
          'Select an independent active Medical Reviewer',
        );
      await this.access.branch(tx, reviewer, row.branchId);
      const table = kind === 'campaigns' ? campaigns : faqs;
      await tx
        .update(table)
        .set({ reviewerId: reviewer.id })
        .where(eq(table.id, row.id));
      await this.access.audit(tx, u, 'reviewer_assigned', row.id, {
        kind,
        reviewerId: reviewer.id,
      });
      return { ok: true };
    });
  }
  submit(session: StaffSession, kind: Kind, contentId: string) {
    return this.database.db.transaction(async (tx) => {
      const u = await this.access.actor(tx, session, [
        'SUPER_ADMIN',
        'BRANCH_ADMIN',
        'PHARMACIST',
      ]);
      const row = await this.content(tx, u, kind, contentId);
      if (!['DRAFT', 'CHANGES_REQUESTED', 'REJECTED'].includes(row.status))
        throw new ConflictException(
          'Only drafts or corrected submissions can enter review',
        );
      if (!row.reviewerId)
        throw new BadRequestException(
          'An independent reviewer must be assigned first',
        );
      await this.videoEligible(tx, row.videoId, row.branchId);
      const table = kind === 'campaigns' ? campaigns : faqs;
      await tx
        .update(table)
        .set({
          status: 'PENDING_REVIEW',
          medicalRevision: null,
          complianceRevision: null,
        })
        .where(eq(table.id, row.id));
      await this.access.audit(tx, u, 'submitted', row.id, {
        kind,
        revision: row.revision,
      });
      return { status: 'PENDING_REVIEW' };
    });
  }
  review(session: StaffSession, kind: Kind, contentId: string, input: unknown) {
    const data = parse(reviewInput, input);
    return this.database.db.transaction(async (tx) => {
      const u = await this.access.actor(
        tx,
        session,
        data.kind === 'MEDICAL' ? ['MEDICAL_REVIEWER'] : ['SUPER_ADMIN'],
      );
      const row = await this.content(tx, u, kind, contentId);
      if (row.authorId === u.id)
        throw new ForbiddenException('Independent review is required');
      if (
        data.kind === 'MEDICAL' &&
        (row.status !== 'PENDING_REVIEW' || data.decision === 'NOT_REQUIRED')
      )
        throw new ConflictException(
          'Medical review requires a pending submission',
        );
      if (
        data.kind === 'COMPLIANCE' &&
        ![
          'PENDING_REVIEW',
          'APPROVED',
          'SCHEDULED',
          'ACTIVE',
          'PUBLISHED',
          'PAUSED',
        ].includes(row.status)
      )
        throw new ConflictException('Submit this revision for review first');
      if (
        data.kind === 'MEDICAL' &&
        (data.approvalReference || data.validUntil)
      )
        throw new BadRequestException(
          'Authorization fields belong to compliance review',
        );
      const promotion =
        'campaignType' in row && row.campaignType === 'PROMOTION';
      const approved = ['APPROVE', 'NOT_REQUIRED'].includes(data.decision);
      if (
        approved &&
        data.kind === 'COMPLIANCE' &&
        promotion &&
        (data.decision !== 'APPROVE' ||
          !data.approvalReference ||
          !data.validUntil ||
          new Date(data.validUntil) <= new Date() ||
          ('endsAt' in row && new Date(data.validUntil) < row.endsAt))
      )
        throw new BadRequestException(
          'Promotions require an authorization reference valid through campaign end',
        );
      await this.videoEligible(tx, row.videoId, row.branchId);
      await tx
        .insert(reviews)
        .values({
          campaignId: kind === 'campaigns' ? row.id : null,
          faqId: kind === 'faqs' ? row.id : null,
          reviewerId: u.id,
          revision: row.revision,
          kind: data.kind,
          decision: data.decision,
          comments: data.comments,
          approvalReference: data.approvalReference,
          validUntil: data.validUntil ? new Date(data.validUntil) : null,
          snapshot: { ...row },
        });
      const table = kind === 'campaigns' ? campaigns : faqs;
      const status = !approved
        ? data.decision === 'REJECT'
          ? 'REJECTED'
          : 'CHANGES_REQUESTED'
        : data.kind === 'MEDICAL'
          ? 'APPROVED'
          : row.status;
      await tx
        .update(table)
        .set({
          status,
          ...(data.kind === 'MEDICAL'
            ? { medicalRevision: approved ? row.revision : null }
            : {
                complianceRevision: approved ? row.revision : null,
                approvalReference: approved
                  ? (data.approvalReference ?? null)
                  : null,
                validUntil:
                  approved && data.validUntil
                    ? new Date(data.validUntil)
                    : null,
              }),
        })
        .where(eq(table.id, row.id));
      await this.access.audit(tx, u, 'review_decision', row.id, {
        kind,
        review: data.kind,
        decision: data.decision,
        revision: row.revision,
      });
      return { ok: true };
    });
  }
  publish(session: StaffSession, kind: Kind, contentId: string) {
    return this.database.db.transaction(async (tx) => {
      const u = await this.access.actor(tx, session, ['SUPER_ADMIN']);
      const row = await this.content(tx, u, kind, contentId);
      const b = await this.access.branch(tx, u, row.branchId);
      if (
        row.status !== 'APPROVED' ||
        row.medicalRevision !== row.revision ||
        row.complianceRevision !== row.revision ||
        !b.isActive ||
        !b.isPublished
      )
        throw new ConflictException(
          'Current medical and compliance approvals and a published branch are required',
        );
      await this.videoEligible(tx, row.videoId, row.branchId);
      if (
        'campaignType' in row &&
        row.campaignType === 'PROMOTION' &&
        (!row.approvalReference ||
          !row.validUntil ||
          row.validUntil <= new Date() ||
          row.validUntil < row.endsAt)
      )
        throw new ConflictException(
          'Regulatory authorization is missing or expired',
        );
      if ('endsAt' in row && row.endsAt <= new Date())
        throw new ConflictException('Campaign has ended');
      if (
        'answerEn' in row &&
        /ignore.{0,30}(instruction|previous)|system\s*prompt|تجاهل.{0,30}تعليمات/i.test(
          row.answerEn + ' ' + row.answerAr,
        )
      )
        throw new BadRequestException(
          'Instruction-like FAQ material cannot be published',
        );
      const status =
        kind === 'faqs'
          ? 'PUBLISHED'
          : 'startsAt' in row && row.startsAt > new Date()
            ? 'SCHEDULED'
            : 'ACTIVE';
      const table = kind === 'campaigns' ? campaigns : faqs;
      await tx.update(table).set({ status }).where(eq(table.id, row.id));
      await this.access.audit(tx, u, 'published', row.id, {
        kind,
        revision: row.revision,
        status,
      });
      return { status };
    });
  }
  pause(session: StaffSession, kind: Kind, contentId: string) {
    return this.database.db.transaction(async (tx) => {
      const u = await this.access.actor(tx, session, [
        'SUPER_ADMIN',
        'BRANCH_ADMIN',
      ]);
      const row = await this.content(tx, u, kind, contentId);
      if (!['ACTIVE', 'SCHEDULED', 'PUBLISHED', 'PAUSED'].includes(row.status))
        throw new ConflictException(
          'Only public or paused content can be paused or archived',
        );
      const table = kind === 'campaigns' ? campaigns : faqs;
      await tx
        .update(table)
        .set({ status: kind === 'campaigns' ? 'PAUSED' : 'ARCHIVED' })
        .where(eq(table.id, row.id));
      await this.access.audit(tx, u, 'paused', row.id, { kind });
      return { ok: true };
    });
  }
  async publicFaqs(branchId?: string) {
    const rows = await this.database.db
      .select({ faq: faqs, branch: branches })
      .from(faqs)
      .innerJoin(branches, eq(branches.id, faqs.branchId))
      .where(
        and(
          eq(faqs.status, 'PUBLISHED'),
          eq(branches.isActive, true),
          eq(branches.isPublished, true),
          sql`${faqs.medicalRevision}=${faqs.revision}`,
          sql`${faqs.complianceRevision}=${faqs.revision}`,
          branchId ? eq(faqs.branchId, branchId) : undefined,
        ),
      )
      .limit(50);
    const eligible = [];
    for (const row of rows) {
      try {
        await this.database.db.transaction((tx) =>
          this.videoEligible(tx, row.faq.videoId, row.branch.id),
        );
        eligible.push({
          id: row.faq.id,
          branchId: row.branch.id,
          questionEn: row.faq.questionEn,
          questionAr: row.faq.questionAr,
          answerEn: row.faq.answerEn,
          answerAr: row.faq.answerAr,
          branchSlug: row.branch.slug,
        });
      } catch {
        /* linked media is no longer public */
      }
    }
    return eligible;
  }
  async publicCampaign(slug: string) {
    parse(branchSlug, slug);
    const [row] = await this.database.db
      .select({ campaign: campaigns, branch: branches })
      .from(campaigns)
      .innerJoin(branches, eq(branches.id, campaigns.branchId))
      .where(
        and(
          eq(campaigns.slug, slug),
          sql`${campaigns.status} IN ('ACTIVE','SCHEDULED')`,
          sql`${campaigns.startsAt} <= now()`,
          gt(campaigns.endsAt, new Date()),
          eq(branches.isActive, true),
          eq(branches.isPublished, true),
          sql`${campaigns.medicalRevision}=${campaigns.revision}`,
          sql`${campaigns.complianceRevision}=${campaigns.revision}`,
          or(
            sql`${campaigns.campaignType}<>'PROMOTION'`,
            and(
              sql`${campaigns.approvalReference} IS NOT NULL`,
              gt(campaigns.validUntil, new Date()),
            ),
          ),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException('Campaign not available');
    const c = row.campaign;
    const videoSlug = await this.database.db.transaction((tx) =>
      this.videoEligible(tx, c.videoId, c.branchId),
    );
    return {
      id: c.id,
      slug: c.slug,
      titleEn: c.titleEn,
      titleAr: c.titleAr,
      bodyEn: c.bodyEn,
      bodyAr: c.bodyAr,
      campaignType: c.campaignType,
      startsAt: c.startsAt,
      endsAt: c.endsAt,
      videoSlug,
      branch: safeBranch(row.branch),
      context: this.security.sign({
        branchId: c.branchId,
        campaignId: c.id,
        qrId: null,
        videoId: null,
        source: 'CAMPAIGN',
      }),
    };
  }
  qrList(session: StaffSession) {
    return this.database.db.transaction(async (tx) => {
      const u = await this.access.actor(tx, session, [
        'SUPER_ADMIN',
        'BRANCH_ADMIN',
      ]);
      return tx
        .select()
        .from(qrs)
        .where(
          u.role === 'SUPER_ADMIN'
            ? undefined
            : sql`EXISTS (SELECT 1 FROM branch_memberships m WHERE m.user_id=${u.id} AND m.branch_id=${qrs.branchId})`,
        )
        .orderBy(desc(qrs.createdAt))
        .limit(200);
    });
  }
  createQr(session: StaffSession, input: unknown) {
    const data = parse(qrInput, input);
    return this.database.db.transaction(async (tx) => {
      const u = await this.access.actor(tx, session, [
        'SUPER_ADMIN',
        'BRANCH_ADMIN',
      ]);
      await this.access.branch(tx, u, data.branchId);
      if (data.campaignId) {
        const campaign = await this.content(
          tx,
          u,
          'campaigns',
          data.campaignId,
        );
        if (campaign.branchId !== data.branchId)
          throw new BadRequestException('QR campaign branch must match');
      }
      const [row] = await tx
        .insert(qrs)
        .values({
          ...data,
          code: randomBytes(12).toString('hex'),
          createdBy: u.id,
        })
        .returning();
      await this.access.audit(tx, u, 'qr_created', row.id);
      return row;
    });
  }
  qrStatus(session: StaffSession, qrId: string, input: unknown) {
    parse(id, qrId);
    const data = parse(z.object({ isActive: z.boolean() }).strict(), input);
    return this.database.db.transaction(async (tx) => {
      const u = await this.access.actor(tx, session, [
        'SUPER_ADMIN',
        'BRANCH_ADMIN',
      ]);
      const [q] = await tx
        .select()
        .from(qrs)
        .where(eq(qrs.id, qrId))
        .for('update');
      if (!q) throw new NotFoundException('QR not found');
      await this.access.branch(tx, u, q.branchId);
      await tx.update(qrs).set(data).where(eq(qrs.id, q.id));
      await this.access.audit(tx, u, 'qr_status_changed', q.id, data);
      return { ok: true };
    });
  }
  async publicQr(code: string) {
    parse(z.string().regex(/^[a-f0-9]{24}$/), code);
    const [row] = await this.database.db
      .select({ qr: qrs, branch: branches })
      .from(qrs)
      .innerJoin(branches, eq(branches.id, qrs.branchId))
      .where(
        and(
          eq(qrs.code, code),
          eq(qrs.isActive, true),
          eq(branches.isActive, true),
          eq(branches.isPublished, true),
        ),
      );
    if (!row) throw new NotFoundException('QR landing not available');
    let campaign = null;
    if (row.qr.campaignId) {
      const [c] = await this.database.db
        .select({ slug: campaigns.slug })
        .from(campaigns)
        .where(eq(campaigns.id, row.qr.campaignId));
      if (!c) throw new NotFoundException('Campaign not found');
      campaign = await this.publicCampaign(c.slug);
    }
    return {
      code,
      destination: row.qr.destination,
      source: row.qr.source,
      branch: safeBranch(row.branch),
      campaign,
      context: this.security.sign({
        branchId: row.branch.id,
        campaignId: campaign?.id ?? null,
        qrId: row.qr.id,
        videoId: null,
        source: row.qr.source,
      }),
    };
  }
  async qrImage(
    session: StaffSession,
    qrId: string,
    format: string,
    locale: string,
  ) {
    parse(z.enum(['png', 'svg']), format);
    parse(z.enum(['en', 'ar']), locale);
    const url = await this.database.db.transaction(async (tx) => {
      const u = await this.access.actor(tx, session, [
        'SUPER_ADMIN',
        'BRANCH_ADMIN',
      ]);
      parse(id, qrId);
      const [q] = await tx.select().from(qrs).where(eq(qrs.id, qrId));
      if (!q) throw new NotFoundException('QR not found');
      const b = await this.access.branch(tx, u, q.branchId);
      if (q.destination === 'WHATSAPP') return b.whatsappUrl;
      if (q.destination === 'MAPS') return b.mapsUrl;
      return (
        (this.env.PUBLIC_SITE_ORIGIN ?? this.env.CORS_ORIGIN) +
        '/' +
        locale +
        '/scan/' +
        q.code
      );
    });
    const options = {
      errorCorrectionLevel: 'M' as const,
      margin: 4,
      width: 1200,
      color: { dark: '#063e3b', light: '#ffffff' },
    };
    return {
      data:
        format === 'svg'
          ? await QRCode.toString(url, { ...options, type: 'svg' })
          : await QRCode.toBuffer(url, { ...options, type: 'png' }),
      url,
    };
  }
  async context(input: unknown) {
    const data = parse(contextInput, input);
    if (data.qrCode)
      return { context: (await this.publicQr(data.qrCode)).context };
    if (data.campaignSlug)
      return {
        context: (await this.publicCampaign(data.campaignSlug)).context,
      };
    let b = data.branchSlug
      ? await this.publishedBranch(data.branchSlug)
      : null;
    let videoId: string | null = null;
    if (data.videoSlug) {
      const v = await this.videos.publicDetail(data.videoSlug);
      if (b && b.id !== v.branch.id)
        throw new BadRequestException(
          'Video contact attribution uses its source branch',
        );
      b = await this.publishedBranch(v.branch.slug);
      videoId = v.id;
    }
    return {
      context: this.security.sign({
        branchId: b?.id ?? null,
        qrId: null,
        campaignId: null,
        videoId,
        source: videoId ? 'VIDEO' : 'WEBSITE',
      }),
    };
  }
  async record(input: unknown, req: Request) {
    const data = parse(
      z
        .object({
          context: z.string().min(10).max(3000),
          eventType: z.enum([
            'VISIT',
            'QR_SCAN',
            'WHATSAPP',
            'DIRECTIONS',
            'CALL',
            'VIDEO_CONTACT',
            'CAMPAIGN_VIEW',
          ]),
        })
        .strict(),
      input,
    );
    const c = this.security.verify(data.context);
    if (
      /bot|crawler|spider|headless|curl|wget/i.test(
        req.headers['user-agent'] ?? '',
      )
    )
      return { accepted: false };
    await this.security.limit(req.ip ?? '', 'events', 120);
    if (
      (data.eventType === 'QR_SCAN' && !c.qrId) ||
      (data.eventType === 'CAMPAIGN_VIEW' && !c.campaignId) ||
      (data.eventType === 'VIDEO_CONTACT' && !c.videoId)
    )
      throw new BadRequestException('Event does not match the signed context');
    if (
      ['WHATSAPP', 'DIRECTIONS', 'CALL'].includes(data.eventType) &&
      !c.branchId
    )
      throw new BadRequestException('Contact events require a branch');
    await this.validateContext(c);
    if (
      !(await this.security.unique(
        req.ip ?? '',
        JSON.stringify(c) + data.eventType,
      ))
    )
      return { accepted: false };
    await this.database.db
      .insert(events)
      .values({
        branchId: c.branchId,
        campaignId: c.campaignId,
        qrId: c.qrId,
        source: c.source,
        eventType: data.eventType,
      });
    return { accepted: true };
  }
  private async validateContext(c: ReturnType<EngagementSecurity['verify']>) {
    if (c.branchId) {
      const [b] = await this.database.db
        .select()
        .from(branches)
        .where(
          and(
            eq(branches.id, c.branchId),
            eq(branches.isActive, true),
            eq(branches.isPublished, true),
          ),
        );
      if (!b) throw new NotFoundException('Branch no longer public');
    }
    if (c.qrId) {
      const [q] = await this.database.db
        .select()
        .from(qrs)
        .where(eq(qrs.id, c.qrId));
      if (!q) throw new NotFoundException('QR no longer available');
      await this.publicQr(q.code);
    }
    if (c.campaignId) {
      const [campaign] = await this.database.db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, c.campaignId));
      if (!campaign) throw new NotFoundException('Campaign not found');
      await this.publicCampaign(campaign.slug);
    }
    if (c.videoId) {
      const [v] = await this.database.db
        .select()
        .from(healthVideos)
        .where(eq(healthVideos.id, c.videoId));
      if (!v) throw new NotFoundException('Video not found');
      await this.videos.publicDetail(v.slug);
    }
  }
  async assistantSignal(branchId: string | null) {
    await this.database.db
      .insert(events)
      .values({ branchId, source: 'ASSISTANT', eventType: 'ASSISTANT' });
  }
  analytics(session: StaffSession, input: Record<string, unknown>) {
    const q = parse(
      z
        .object({
          branchId: id.optional(),
          campaignId: id.optional(),
          from: z.iso.date().optional(),
          to: z.iso.date().optional(),
        })
        .strict(),
      input,
    );
    const from = q.from
        ? new Date(q.from)
        : new Date(Date.now() - 30 * 86400000),
      to = q.to ? new Date(new Date(q.to).getTime() + 86400000) : new Date();
    if (to <= from || to.getTime() - from.getTime() > 366 * 86400000)
      throw new BadRequestException('Choose a date range of 1–366 days');
    return this.database.db.transaction(async (tx) => {
      const u = await this.access.actor(tx, session, [
        'SUPER_ADMIN',
        'BRANCH_ADMIN',
      ]);
      if (q.branchId) await this.access.branch(tx, u, q.branchId);
      if (q.campaignId) await this.content(tx, u, 'campaigns', q.campaignId);
      const scope =
        u.role === 'SUPER_ADMIN'
          ? undefined
          : sql`EXISTS (SELECT 1 FROM branch_memberships m WHERE m.user_id=${u.id} AND m.branch_id=${events.branchId})`;
      const rows = await tx
        .select({
          branchId: events.branchId,
          campaignId: events.campaignId,
          source: events.source,
          eventType: events.eventType,
          count: sql<number>`count(*)::int`,
        })
        .from(events)
        .where(
          and(
            scope,
            q.branchId ? eq(events.branchId, q.branchId) : undefined,
            q.campaignId ? eq(events.campaignId, q.campaignId) : undefined,
            sql`${events.createdAt} >= ${from} AND ${events.createdAt} < ${to}`,
          ),
        )
        .groupBy(
          events.branchId,
          events.campaignId,
          events.source,
          events.eventType,
        );
      const videoContacts = q.campaignId
        ? []
        : await tx
            .select({
              branchId: healthVideoEvents.branchId,
              eventType: healthVideoEvents.eventType,
              count: sql<number>`count(*)::int`,
            })
            .from(healthVideoEvents)
            .where(
              and(
                sql`${healthVideoEvents.eventType} IN ('CONTACT','WHATSAPP','DIRECTIONS')`,
                q.branchId
                  ? eq(healthVideoEvents.branchId, q.branchId)
                  : undefined,
                u.role === 'SUPER_ADMIN'
                  ? undefined
                  : sql`EXISTS (SELECT 1 FROM branch_memberships m WHERE m.user_id=${u.id} AND m.branch_id=${healthVideoEvents.branchId})`,
                sql`${healthVideoEvents.createdAt} >= ${from} AND ${healthVideoEvents.createdAt} < ${to}`,
              ),
            )
            .groupBy(healthVideoEvents.branchId, healthVideoEvents.eventType);
      return {
        from: from.toISOString(),
        to: to.toISOString(),
        rows,
        videoContacts,
        definition:
          'Aggregate engagement signals; not unique people, purchases, or verified in-store visits.',
      };
    });
  }
  async csv(session: StaffSession, q: Record<string, unknown>) {
    const report = await this.analytics(session, q);
    const cell = (v: unknown) =>
      '"' +
      String(v ?? '')
        .replace(/^[=+@\-\t\r]/, "'$&")
        .replaceAll('"', '""') +
      '"';
    return (
      '\ufeff' +
      [
        'branch_id,campaign_id,source,event,count',
        ...report.rows.map((r) =>
          [r.branchId, r.campaignId, r.source, r.eventType, r.count]
            .map(cell)
            .join(','),
        ),
      ].join('\r\n')
    );
  }
}
