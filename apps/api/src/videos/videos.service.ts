import {
  Injectable,
  Inject,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
  HttpException,
  OnApplicationShutdown,
} from '@nestjs/common';
import { randomUUID, createHmac, randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import type { Response, Request } from 'express';
import { z } from 'zod';
import {
  healthVideos as videos,
  healthVideoCategories as categories,
  healthVideoUploads as uploads,
  healthVideoAssets as assets,
  healthVideoReferences as references,
  healthVideoReviews as reviews,
  healthVideoReviewerAssignments as assignments,
  healthVideoVersions as versions,
  healthVideoEvents as events,
  staffUsers,
  branchMemberships,
  branches,
  authSessions,
  adminAuditLogs,
  eq,
  and,
  or,
  sql,
  desc,
  asc,
  ilike,
  gt,
  isNull,
} from '@gulf/database';
import {
  LocalMediaStorage,
  mediaQueue,
  mediaConfig,
  MediaFault,
} from '@gulf/media';
import { ENVIRONMENT, type Environment } from '../config/environment';
import { DatabaseService } from '../infrastructure/database.service';
import { hashPassword } from '../auth/password';
import type { StaffSession } from '../auth/auth.types';
import {
  categoryInput,
  videoInput,
  decisionInput,
  staffInput,
  parse,
  id,
} from './contracts';
type Tx = Parameters<Parameters<DatabaseService['db']['transaction']>[0]>[0];
type User = typeof staffUsers.$inferSelect;
type Video = typeof videos.$inferSelect;
const editable = [
  'DRAFT',
  'CHANGES_REQUESTED',
  'REJECTED',
  'APPROVED',
  'PUBLISHED',
  'PROCESSING_FAILED',
];
const publicGate = () =>
  and(
    eq(videos.status, 'PUBLISHED'),
    eq(videos.medicalReviewStatus, 'APPROVED'),
    eq(videos.complianceStatus, 'APPROVED'),
    sql`${videos.medicalRevision} = ${videos.revision}`,
    sql`${videos.complianceRevision} = ${videos.revision}`,
    eq(categories.isActive, true),
    eq(branches.isActive, true),
    eq(branches.isPublished, true),
    eq(uploads.state, 'READY'),
    or(
      eq(videos.contentKind, 'GENERAL_EDUCATION'),
      and(
        sql`${videos.complianceReference} IS NOT NULL`,
        gt(videos.complianceValidUntil, new Date()),
      ),
    ),
  );
@Injectable()
export class VideosService implements OnApplicationShutdown {
  readonly storage: LocalMediaStorage;
  readonly config;
  private queue?: ReturnType<typeof mediaQueue>;
  private readonly eventSecret = randomBytes(32);
  private readonly signals = new Map<string, number>();
  constructor(
    private readonly database: DatabaseService,
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {
    this.config = mediaConfig(env as unknown as NodeJS.ProcessEnv);
    this.storage = new LocalMediaStorage(this.config.MEDIA_STORAGE_ROOT);
  }
  async onApplicationShutdown() {
    await this.queue?.close();
  }
  private async actor(tx: Tx, session: StaffSession, roles?: string[]) {
    const [user] = await tx
      .select()
      .from(staffUsers)
      .where(eq(staffUsers.id, session.user.id))
      .for('update');
    const [active] = await tx
      .select()
      .from(authSessions)
      .where(
        and(
          eq(authSessions.id, session.sessionId),
          eq(authSessions.userId, session.user.id),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, new Date()),
        ),
      );
    if (!user?.isActive || !active)
      throw new UnauthorizedException('Session expired or revoked');
    if (roles && !roles.includes(user.role))
      throw new ForbiddenException(
        'This action requires a different staff role',
      );
    return user;
  }
  private async branch(
    tx: Tx,
    user: User,
    branchId: string,
    requireActive = false,
  ) {
    const [b] = await tx
      .select()
      .from(branches)
      .where(eq(branches.id, branchId));
    if (!b || (requireActive && !b.isActive))
      throw new BadRequestException('An active branch is required');
    if (user.role !== 'SUPER_ADMIN') {
      const [m] = await tx
        .select()
        .from(branchMemberships)
        .where(
          and(
            eq(branchMemberships.userId, user.id),
            eq(branchMemberships.branchId, branchId),
          ),
        );
      if (!m) throw new ForbiddenException('Branch access denied');
    }
    return b;
  }
  private async authorized(tx: Tx, user: User, videoId: string) {
    parse(id, videoId);
    const [v] = await tx
      .select()
      .from(videos)
      .where(eq(videos.id, videoId))
      .for('update');
    if (!v) throw new NotFoundException('Video not found');
    await this.branch(tx, user, v.branchId);
    if (user.role === 'PHARMACIST' && v.authorId !== user.id)
      throw new ForbiddenException('Only your own content is available');
    if (user.role === 'MEDICAL_REVIEWER') {
      const [a] = await tx
        .select()
        .from(assignments)
        .where(
          and(
            eq(assignments.videoId, v.id),
            eq(assignments.reviewerId, user.id),
          ),
        );
      if (!a) throw new ForbiddenException('This video is not assigned to you');
    }
    return v;
  }
  private audit(
    tx: Tx,
    user: User,
    action: string,
    targetId: string,
    metadata: Record<string, unknown> = {},
  ) {
    return tx.insert(adminAuditLogs).values({
      actorId: user.id,
      action: 'video.' + action,
      targetId,
      details: metadata,
    });
  }
  private async reset(tx: Tx, v: Video) {
    await tx
      .update(videos)
      .set({
        revision: v.revision + 1,
        status: 'DRAFT',
        medicalReviewStatus: 'PENDING',
        complianceStatus: 'PENDING',
        medicalRevision: null,
        complianceRevision: null,
        publishedAt: null,
        authorAttributionApproved: false,
        complianceReference: null,
        complianceValidUntil: null,
      })
      .where(eq(videos.id, v.id));
  }
  listBranches(session: StaffSession) {
    return this.database.db.transaction(async (tx) => {
      const user = await this.actor(tx, session);
      if (user.role === 'SUPER_ADMIN')
        return tx.select().from(branches).where(eq(branches.isActive, true));
      return tx
        .select({ branch: branches })
        .from(branches)
        .innerJoin(
          branchMemberships,
          eq(branchMemberships.branchId, branches.id),
        )
        .where(
          and(
            eq(branchMemberships.userId, user.id),
            eq(branches.isActive, true),
          ),
        )
        .then((rows) => rows.map((r) => r.branch));
    });
  }
  async categoryList(session?: StaffSession) {
    if (session)
      return this.database.db.transaction(async (tx) => {
        await this.actor(tx, session);
        return tx
          .select()
          .from(categories)
          .orderBy(asc(categories.sortOrder), asc(categories.titleEn));
      });
    return this.database.db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder), asc(categories.titleEn));
  }
  saveCategory(session: StaffSession, input: unknown, categoryId?: string) {
    const data = parse(categoryInput, input);
    if (categoryId) parse(id, categoryId);
    return this.database.db.transaction(async (tx) => {
      const user = await this.actor(tx, session, ['SUPER_ADMIN']);
      const [row] = categoryId
        ? await tx
            .update(categories)
            .set(data)
            .where(eq(categories.id, categoryId))
            .returning()
        : await tx.insert(categories).values(data).returning();
      if (!row) throw new NotFoundException('Category not found');
      await this.audit(tx, user, 'category_saved', row.id);
      return row;
    });
  }
  async createStaff(session: StaffSession, input: unknown) {
    const data = parse(staffInput, input);
    const passwordHash = await hashPassword(data.password);
    return this.database.db.transaction(async (tx) => {
      const user = await this.actor(tx, session, ['SUPER_ADMIN']);
      for (const branchId of data.branchIds)
        await this.branch(tx, user, branchId);
      const [existing] = await tx
        .select({ id: staffUsers.id })
        .from(staffUsers)
        .where(eq(staffUsers.username, data.username));
      if (existing) throw new ConflictException('Username already exists');
      const [created] = await tx
        .insert(staffUsers)
        .values({
          username: data.username,
          displayName: data.displayName,
          passwordHash,
          role: data.role,
        })
        .returning({
          id: staffUsers.id,
          username: staffUsers.username,
          displayName: staffUsers.displayName,
          role: staffUsers.role,
        });
      await tx.insert(branchMemberships).values(
        [...new Set(data.branchIds)].map((branchId) => ({
          branchId,
          userId: created.id,
        })),
      );
      await this.audit(tx, user, 'staff_created', created.id, {
        role: data.role,
      });
      return created;
    });
  }
  create(session: StaffSession, input: unknown) {
    const { references: refs, ...data } = parse(videoInput, input);
    return this.database.db.transaction(async (tx) => {
      const user = await this.actor(tx, session, ['PHARMACIST']);
      await this.branch(tx, user, data.branchId, true);
      const [category] = await tx
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.id, data.categoryId),
            eq(categories.isActive, true),
          ),
        );
      if (!category) throw new BadRequestException('Select an active category');
      const [existing] = await tx
        .select({ id: videos.id })
        .from(videos)
        .where(eq(videos.slug, data.slug));
      if (existing)
        throw new ConflictException('This video slug is already used');
      const [v] = await tx
        .insert(videos)
        .values({ ...data, authorId: user.id })
        .returning();
      if (refs.length)
        await tx
          .insert(references)
          .values(refs.map((r) => ({ ...r, videoId: v.id })));
      await this.audit(tx, user, 'created', v.id);
      return { id: v.id };
    });
  }
  update(session: StaffSession, videoId: string, input: unknown) {
    const { references: refs, ...data } = parse(videoInput, input);
    return this.database.db.transaction(async (tx) => {
      const user = await this.actor(tx, session, [
        'SUPER_ADMIN',
        'BRANCH_ADMIN',
        'PHARMACIST',
      ]);
      const v = await this.authorized(tx, user, videoId);
      if (!editable.includes(v.status))
        throw new ConflictException(
          'This video cannot be edited in its current state',
        );
      if (data.branchId !== v.branchId)
        throw new BadRequestException('The source branch cannot change');
      const [c] = await tx
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.id, data.categoryId),
            eq(categories.isActive, true),
          ),
        );
      if (!c) throw new BadRequestException('Select an active category');
      const [existing] = await tx
        .select({ id: videos.id })
        .from(videos)
        .where(eq(videos.slug, data.slug));
      if (existing && existing.id !== videoId)
        throw new ConflictException('This video slug is already used');
      await this.reset(tx, v);
      await tx.update(videos).set(data).where(eq(videos.id, v.id));
      await tx.delete(references).where(eq(references.videoId, v.id));
      if (refs.length)
        await tx
          .insert(references)
          .values(refs.map((r) => ({ ...r, videoId: v.id })));
      await this.audit(tx, user, 'content_revised', v.id, {
        revision: v.revision + 1,
      });
      return { id: v.id };
    });
  }
  list(session: StaffSession, query: Record<string, unknown>) {
    const page = parse(
      z.coerce.number().int().min(1).max(10000),
      query.page ?? 1,
    );
    return this.database.db.transaction(async (tx) => {
      const user = await this.actor(tx, session);
      const scope =
        user.role === 'SUPER_ADMIN'
          ? undefined
          : and(
              sql`EXISTS (SELECT 1 FROM branch_memberships m WHERE m.user_id = ${user.id} AND m.branch_id = ${videos.branchId})`,
              user.role === 'PHARMACIST'
                ? eq(videos.authorId, user.id)
                : user.role === 'MEDICAL_REVIEWER'
                  ? sql`EXISTS (SELECT 1 FROM health_video_reviewer_assignments a WHERE a.video_id = ${videos.id} AND a.reviewer_id = ${user.id})`
                  : undefined,
            );
      const counts = await tx
        .select({ status: videos.status, count: sql<number>`count(*)::int` })
        .from(videos)
        .where(scope)
        .groupBy(videos.status);
      const filter = and(
        scope,
        query.review === 'true'
          ? eq(videos.status, 'PENDING_REVIEW')
          : undefined,
      );
      const items = await tx
        .select({
          id: videos.id,
          titleEn: videos.titleEn,
          titleAr: videos.titleAr,
          status: videos.status,
          revision: videos.revision,
          branchId: videos.branchId,
          updatedAt: videos.updatedAt,
        })
        .from(videos)
        .where(filter)
        .orderBy(desc(videos.updatedAt))
        .limit(20)
        .offset((page - 1) * 20);
      return {
        items,
        counts,
        page,
        pageSize: 20,
        total: counts.reduce((n, r) => n + r.count, 0),
      };
    });
  }
  detail(session: StaffSession, videoId: string) {
    return this.database.db.transaction(async (tx) => {
      const user = await this.actor(tx, session);
      const v = await this.authorized(tx, user, videoId);
      const refs = await tx
        .select({
          sourceTitle: references.sourceTitle,
          sourceUrl: references.sourceUrl,
        })
        .from(references)
        .where(eq(references.videoId, v.id));
      const history = await tx
        .select({
          id: reviews.id,
          kind: reviews.kind,
          decision: reviews.decision,
          comments: reviews.comments,
          revision: reviews.revision,
          reviewedAt: reviews.reviewedAt,
        })
        .from(reviews)
        .where(eq(reviews.videoId, v.id))
        .orderBy(desc(reviews.reviewedAt));
      const media = v.currentUploadId
        ? await tx
            .select({
              id: assets.id,
              assetType: assets.assetType,
              mimeType: assets.mimeType,
              fileSize: assets.fileSize,
              processingStatus: assets.processingStatus,
              width: assets.width,
              height: assets.height,
              durationSeconds: assets.durationSeconds,
            })
            .from(assets)
            .where(
              and(
                eq(assets.videoId, v.id),
                eq(assets.uploadId, v.currentUploadId),
              ),
            )
        : [];
      const assigned = await tx
        .select({ reviewerId: assignments.reviewerId })
        .from(assignments)
        .where(eq(assignments.videoId, v.id));
      const [u] = v.currentUploadId
        ? await tx
            .select()
            .from(uploads)
            .where(eq(uploads.id, v.currentUploadId))
        : [];
      return {
        ...v,
        references: refs,
        reviews: history,
        assets: media,
        reviewerIds: assigned.map((r) => r.reviewerId),
        processingError: u?.errorCode ?? null,
      };
    });
  }
  async upload(session: StaffSession, videoId: string, req: Request) {
    const length = Number(req.headers['content-length']);
    const max = this.config.MEDIA_MAX_UPLOAD_MB * 1024 * 1024;
    if (!Number.isSafeInteger(length) || length < 16 || length > max)
      throw new HttpException(
        'Video size must be between 16 bytes and ' +
          this.config.MEDIA_MAX_UPLOAD_MB +
          ' MB',
        413,
      );
    if (
      !['video/mp4', 'video/quicktime'].includes(
        String(req.headers['content-type']),
      )
    )
      throw new BadRequestException('Only MP4 or MOV videos are supported');
    const uploadId = randomUUID();
    let oldId: string | null = null;
    await this.database.db.transaction(async (tx) => {
      const user = await this.actor(tx, session, ['PHARMACIST']);
      const v = await this.authorized(tx, user, videoId);
      if (!editable.includes(v.status))
        throw new ConflictException('Video is not ready for a new upload');
      await tx.execute(sql`SELECT pg_advisory_xact_lock(780124802)`);
      const [used] = await tx
        .select({
          bytes: sql<string>`coalesce(sum(${uploads.reservedBytes}),0)`,
        })
        .from(uploads);
      const reserved = length + 2 * max + 4 * 1024 * 1024;
      if (
        Number(used.bytes) + reserved >
        this.config.MEDIA_QUOTA_MB * 1024 * 1024
      )
        throw new HttpException('Media storage quota is full', 507);
      oldId = v.currentUploadId;
      await this.reset(tx, v);
      await tx.insert(uploads).values({
        id: uploadId,
        videoId: v.id,
        expectedBytes: length,
        reservedBytes: reserved,
      });
      await tx
        .update(videos)
        .set({
          currentUploadId: uploadId,
          status: 'UPLOADING',
          durationSeconds: null,
        })
        .where(eq(videos.id, v.id));
      await this.audit(tx, user, 'upload_started', v.id, {
        uploadId,
        revision: v.revision + 1,
      });
    });
    try {
      await this.storage.createPrefix(uploadId);
      const result = await this.storage.writeUpload(
        uploadId,
        req,
        length,
        max,
        this.config.MEDIA_UPLOAD_TIMEOUT_SECONDS,
      );
      await this.database.db.transaction(async (tx) => {
        const user = await this.actor(tx, session, ['PHARMACIST']);
        const v = await this.authorized(tx, user, videoId);
        if (v.currentUploadId !== uploadId || v.status !== 'UPLOADING')
          throw new ConflictException('Upload was superseded');
        await tx.insert(assets).values({
          videoId,
          uploadId,
          assetType: 'SOURCE',
          storageKey: uploadId + '/source.bin',
          mimeType: String(req.headers['content-type']),
          fileSize: result.fileSize,
        });
        await tx
          .update(uploads)
          .set({ state: 'QUEUED', checksum: result.checksum })
          .where(eq(uploads.id, uploadId));
        await tx
          .update(videos)
          .set({ status: 'PROCESSING' })
          .where(eq(videos.id, videoId));
        await this.audit(tx, user, 'upload_accepted', videoId, { uploadId });
      });
      if (oldId) {
        await this.storage.removePrefix(oldId);
        await this.database.db
          .update(uploads)
          .set({ state: 'ABANDONED', reservedBytes: 0 })
          .where(eq(uploads.id, oldId));
      }
      try {
        this.queue ??= mediaQueue(this.env.REDIS_URL, this.config);
        await this.queue.add(
          'process',
          { uploadId },
          { jobId: uploadId + '-0' },
        );
      } catch {
        /* durable QUEUED outbox is dispatched by worker */
      }
      return { status: 'PROCESSING' };
    } catch (error) {
      await this.storage.removePrefix(uploadId);
      await this.database.db.transaction(async (tx) => {
        await tx
          .update(uploads)
          .set({
            state: 'ABANDONED',
            reservedBytes: 0,
            errorCode:
              error instanceof MediaFault ? error.code : 'UPLOAD_FAILED',
          })
          .where(eq(uploads.id, uploadId));
        await tx
          .update(videos)
          .set({ status: 'PROCESSING_FAILED' })
          .where(
            and(eq(videos.id, videoId), eq(videos.currentUploadId, uploadId)),
          );
        await tx.insert(adminAuditLogs).values({
          actorId: session.user.id,
          action: 'video.upload_failed',
          targetId: videoId,
          details: {
            uploadId,
            errorCode:
              error instanceof MediaFault ? error.code : 'UPLOAD_FAILED',
          },
        });
      });
      if (error instanceof MediaFault)
        throw new BadRequestException(error.code);
      throw error;
    }
  }
  retry(session: StaffSession, videoId: string) {
    return this.database.db.transaction(async (tx) => {
      const user = await this.actor(tx, session, ['SUPER_ADMIN', 'PHARMACIST']);
      const v = await this.authorized(tx, user, videoId);
      if (v.status !== 'PROCESSING_FAILED' || !v.currentUploadId)
        throw new ConflictException('No failed processing job to retry');
      const [u] = await tx
        .select()
        .from(uploads)
        .where(eq(uploads.id, v.currentUploadId));
      if (u?.state !== 'FAILED')
        throw new ConflictException('Upload a new source video');
      if (u.retryCount >= 5)
        throw new ConflictException(
          'Retry limit reached; upload a corrected source',
        );
      await tx
        .update(uploads)
        .set({ state: 'QUEUED', retryCount: u.retryCount + 1, errorCode: null })
        .where(eq(uploads.id, u.id));
      await tx
        .update(videos)
        .set({ status: 'PROCESSING' })
        .where(eq(videos.id, v.id));
      await this.audit(tx, user, 'processing_retried', v.id);
      return { status: 'PROCESSING' };
    });
  }
  assign(session: StaffSession, videoId: string, input: unknown) {
    const data = parse(z.object({ reviewerId: id }).strict(), input);
    return this.database.db.transaction(async (tx) => {
      const user = await this.actor(tx, session, ['SUPER_ADMIN']);
      const v = await this.authorized(tx, user, videoId);
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
      if (!reviewer || reviewer.id === v.authorId)
        throw new BadRequestException(
          'Choose an independent active medical reviewer',
        );
      await this.branch(tx, reviewer, v.branchId);
      await tx
        .insert(assignments)
        .values({ videoId: v.id, reviewerId: reviewer.id, assignedBy: user.id })
        .onConflictDoNothing();
      await this.audit(tx, user, 'reviewer_assigned', v.id, {
        reviewerId: reviewer.id,
      });
      return { ok: true };
    });
  }
  submit(session: StaffSession, videoId: string) {
    return this.database.db.transaction(async (tx) => {
      const user = await this.actor(tx, session, [
        'SUPER_ADMIN',
        'BRANCH_ADMIN',
        'PHARMACIST',
      ]);
      const v = await this.authorized(tx, user, videoId);
      if (
        !['DRAFT', 'CHANGES_REQUESTED', 'REJECTED'].includes(v.status) ||
        !v.currentUploadId
      )
        throw new ConflictException('Only a processed draft can be submitted');
      const [u] = await tx
        .select()
        .from(uploads)
        .where(eq(uploads.id, v.currentUploadId));
      const refs = await tx
        .select()
        .from(references)
        .where(eq(references.videoId, v.id));
      if (
        u?.state !== 'READY' ||
        !v.descriptionEn.trim() ||
        !v.descriptionAr.trim() ||
        !refs.length
      )
        throw new BadRequestException(
          'Processed video, bilingual descriptions and supporting references are required',
        );
      await tx
        .insert(versions)
        .values({
          videoId: v.id,
          revision: v.revision,
          snapshot: { ...v, references: refs, uploadChecksum: u.checksum },
        })
        .onConflictDoNothing();
      await tx
        .update(videos)
        .set({
          status: 'PENDING_REVIEW',
          medicalReviewStatus: 'PENDING',
          medicalRevision: null,
        })
        .where(eq(videos.id, v.id));
      await this.audit(tx, user, 'submitted', v.id, { revision: v.revision });
      return { status: 'PENDING_REVIEW' };
    });
  }
  decide(
    session: StaffSession,
    videoId: string,
    input: unknown,
    kind: 'MEDICAL' | 'COMPLIANCE',
  ) {
    const data = parse(decisionInput, input);
    return this.database.db.transaction(async (tx) => {
      const user = await this.actor(
        tx,
        session,
        kind === 'MEDICAL' ? ['MEDICAL_REVIEWER'] : ['SUPER_ADMIN'],
      );
      const v = await this.authorized(tx, user, videoId);
      if (v.authorId === user.id)
        throw new ForbiddenException('Independent review is required');
      if (
        kind === 'MEDICAL' &&
        (v.status !== 'PENDING_REVIEW' || data.decision === 'NOT_REQUIRED')
      )
        throw new ConflictException(
          'Medical decisions require a pending submission',
        );
      if (
        kind === 'COMPLIANCE' &&
        !['PENDING_REVIEW', 'APPROVED', 'PUBLISHED'].includes(v.status)
      )
        throw new ConflictException(
          'Submit this revision before compliance review',
        );
      if (
        kind === 'MEDICAL' &&
        (data.approvalReference ||
          data.validUntil ||
          data.authorAttributionApproved !== undefined)
      )
        throw new BadRequestException(
          'Compliance fields require a separate compliance decision',
        );
      if (
        kind === 'COMPLIANCE' &&
        ['APPROVE', 'NOT_REQUIRED'].includes(data.decision) &&
        v.contentKind === 'REGULATED_PROMOTION' &&
        (data.decision === 'NOT_REQUIRED' ||
          !data.approvalReference ||
          !data.validUntil ||
          new Date(data.validUntil) <= new Date())
      )
        throw new BadRequestException(
          'Promotions require an authorization reference and future validity',
        );
      await tx.insert(reviews).values({
        videoId: v.id,
        reviewerId: user.id,
        revision: v.revision,
        kind,
        decision: data.decision,
        comments: data.comments,
        approvalReference: data.approvalReference,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
      });
      const approved = ['APPROVE', 'NOT_REQUIRED'].includes(data.decision);
      const reviewStatus = approved
        ? 'APPROVED'
        : data.decision === 'REJECT'
          ? 'REJECTED'
          : 'CHANGES_REQUESTED';
      if (kind === 'MEDICAL')
        await tx
          .update(videos)
          .set({
            medicalReviewStatus: reviewStatus,
            medicalRevision: v.revision,
            status: reviewStatus === 'APPROVED' ? 'APPROVED' : reviewStatus,
            publishedAt: null,
          })
          .where(eq(videos.id, v.id));
      else
        await tx
          .update(videos)
          .set({
            complianceStatus: reviewStatus,
            complianceRevision: v.revision,
            complianceReference: data.approvalReference ?? null,
            complianceValidUntil: data.validUntil
              ? new Date(data.validUntil)
              : null,
            authorAttributionApproved:
              approved && (data.authorAttributionApproved ?? false),
            ...(!approved
              ? {
                  status:
                    reviewStatus === 'REJECTED'
                      ? ('REJECTED' as const)
                      : ('CHANGES_REQUESTED' as const),
                  publishedAt: null,
                }
              : {}),
          })
          .where(eq(videos.id, v.id));
      await this.audit(tx, user, kind.toLowerCase() + '_decision', v.id, {
        decision: data.decision,
        revision: v.revision,
      });
      return { ok: true };
    });
  }
  publish(session: StaffSession, videoId: string) {
    return this.database.db.transaction(async (tx) => {
      const user = await this.actor(tx, session, ['SUPER_ADMIN']);
      const v = await this.authorized(tx, user, videoId);
      const [c] = await tx
        .select()
        .from(categories)
        .where(eq(categories.id, v.categoryId));
      const [b] = await tx
        .select()
        .from(branches)
        .where(eq(branches.id, v.branchId));
      const [u] = v.currentUploadId
        ? await tx
            .select()
            .from(uploads)
            .where(eq(uploads.id, v.currentUploadId))
        : [];
      if (
        v.status !== 'APPROVED' ||
        v.medicalReviewStatus !== 'APPROVED' ||
        v.complianceStatus !== 'APPROVED' ||
        v.medicalRevision !== v.revision ||
        v.complianceRevision !== v.revision ||
        !c?.isActive ||
        !b?.isPublished ||
        !b.isActive ||
        u?.state !== 'READY' ||
        (v.contentKind === 'REGULATED_PROMOTION' &&
          (!v.complianceReference ||
            !v.complianceValidUntil ||
            v.complianceValidUntil <= new Date()))
      )
        throw new ConflictException(
          'Current medical and compliance approvals, processed media, active category and published branch are required',
        );
      await tx
        .update(videos)
        .set({ status: 'PUBLISHED', publishedAt: new Date() })
        .where(eq(videos.id, v.id));
      await this.audit(tx, user, 'published', v.id, { revision: v.revision });
      return { status: 'PUBLISHED' };
    });
  }
  archive(session: StaffSession, videoId: string) {
    return this.database.db.transaction(async (tx) => {
      const user = await this.actor(tx, session, ['SUPER_ADMIN']);
      const v = await this.authorized(tx, user, videoId);
      if (['UPLOADING', 'PROCESSING', 'ARCHIVED'].includes(v.status))
        throw new ConflictException('Video cannot be archived in this state');
      await tx
        .update(videos)
        .set({ status: 'ARCHIVED', publishedAt: null })
        .where(eq(videos.id, v.id));
      await this.audit(tx, user, 'archived', v.id);
      return { status: 'ARCHIVED' };
    });
  }
  async captions(session: StaffSession, videoId: string, input: unknown) {
    const data = parse(
      z
        .object({
          locale: z.enum(['en', 'ar']),
          text: z
            .string()
            .min(7)
            .max(1024 * 1024),
        })
        .strict(),
      input,
    );
    if (
      Buffer.byteLength(data.text) > 1024 * 1024 ||
      !/^WEBVTT(?:\r?\n|$)/.test(data.text) ||
      /[<>]/.test(data.text.replaceAll('-->', '')) ||
      [...data.text].some(
        (c) => c.charCodeAt(0) < 32 && !['\n', '\r', '\t'].includes(c),
      ) ||
      /^(STYLE|REGION)\b/m.test(data.text)
    )
      throw new BadRequestException(
        'Upload plain-text WEBVTT captions without markup',
      );
    return this.database.db.transaction(async (tx) => {
      const user = await this.actor(tx, session, ['PHARMACIST']);
      const v = await this.authorized(tx, user, videoId);
      if (!editable.includes(v.status) || !v.currentUploadId)
        throw new ConflictException('A processed editable video is required');
      const [u] = await tx
        .select()
        .from(uploads)
        .where(eq(uploads.id, v.currentUploadId));
      if (u?.state !== 'READY')
        throw new ConflictException('Wait for media processing');
      const cues = data.text
        .split(/\r?\n/)
        .filter((line) => line.includes('-->'));
      const seconds = (value: string) =>
        value.split(':').reduce((sum, part) => sum * 60 + Number(part), 0);
      if (
        !cues.length ||
        cues.some((line) => {
          const m =
            /^((?:\d{2}:)?\d{2}:\d{2}\.\d{3}) --> ((?:\d{2}:)?\d{2}:\d{2}\.\d{3})$/.exec(
              line,
            );
          return (
            !m ||
            seconds(m[1]) >= seconds(m[2]) ||
            seconds(m[2]) > (v.durationSeconds ?? 0) + 1
          );
        })
      )
        throw new BadRequestException(
          'Caption cue timestamps must be valid and within the video duration',
        );
      const key =
        u.id + '/caption-' + data.locale + '-' + randomUUID() + '.vtt';
      await fs.writeFile(this.storage.path(key), data.text, {
        flag: 'wx',
        mode: 0o600,
      });
      try {
        const assetType =
          data.locale === 'en'
            ? ('CAPTIONS_EN' as const)
            : ('CAPTIONS_AR' as const);
        const [old] = await tx
          .select()
          .from(assets)
          .where(
            and(eq(assets.uploadId, u.id), eq(assets.assetType, assetType)),
          );
        await tx
          .insert(assets)
          .values({
            videoId: v.id,
            uploadId: u.id,
            assetType,
            storageKey: key,
            mimeType: 'text/vtt',
            fileSize: Buffer.byteLength(data.text),
          })
          .onConflictDoUpdate({
            target: [assets.uploadId, assets.assetType],
            set: { storageKey: key, fileSize: Buffer.byteLength(data.text) },
          });
        await this.reset(tx, v);
        await this.audit(tx, user, 'captions_revised', v.id, {
          locale: data.locale,
        });
        if (old) await this.storage.removeFile(old.storageKey);
        return { ok: true };
      } catch (error) {
        await this.storage.removeFile(key);
        throw error;
      }
    });
  }
  private publicQuery() {
    return this.database.db
      .select({
        video: videos,
        category: categories,
        branch: branches,
        author: {
          displayName: staffUsers.displayName,
          isActive: staffUsers.isActive,
        },
      })
      .from(videos)
      .innerJoin(categories, eq(categories.id, videos.categoryId))
      .innerJoin(branches, eq(branches.id, videos.branchId))
      .innerJoin(uploads, eq(uploads.id, videos.currentUploadId))
      .innerJoin(staffUsers, eq(staffUsers.id, videos.authorId));
  }
  private async publicDto(
    row: Awaited<
      ReturnType<ReturnType<VideosService['publicQuery']>['where']>
    >[number],
  ) {
    const v = row.video;
    const refs = await this.database.db
      .select({
        sourceTitle: references.sourceTitle,
        sourceUrl: references.sourceUrl,
      })
      .from(references)
      .where(eq(references.videoId, v.id));
    const media = await this.database.db
      .select({ type: assets.assetType })
      .from(assets)
      .where(eq(assets.uploadId, v.currentUploadId!));
    const b = row.branch;
    return {
      id: v.id,
      slug: v.slug,
      titleEn: v.titleEn,
      titleAr: v.titleAr,
      descriptionEn: v.descriptionEn,
      descriptionAr: v.descriptionAr,
      category: row.category,
      branch: {
        id: b.id,
        slug: b.slug,
        nameEn: b.nameEn,
        nameAr: b.nameAr,
        phone: b.phone,
        whatsappUrl: b.whatsappUrl,
        mapsUrl: b.mapsUrl,
      },
      durationSeconds: v.durationSeconds,
      publishedAt: v.publishedAt,
      updatedAt: v.updatedAt,
      authorName:
        v.authorAttributionApproved && row.author.isActive
          ? row.author.displayName
          : null,
      contentKind: v.contentKind,
      hasThumbnail: media.some((a) => a.type === 'THUMBNAIL'),
      captions: media
        .filter((a) => ['CAPTIONS_EN', 'CAPTIONS_AR'].includes(a.type))
        .map((a) => (a.type === 'CAPTIONS_EN' ? 'en' : 'ar')),
      references: refs,
    };
  }
  async publicList(query: Record<string, unknown>) {
    if (query.branch) {
      const branchSlug = parse(
        z.string().regex(/^[a-z0-9-]{1,120}$/),
        query.branch,
      );
      const [target] = await this.database.db
        .select({ id: branches.id })
        .from(branches)
        .where(
          and(
            eq(branches.slug, branchSlug),
            eq(branches.isActive, true),
            eq(branches.isPublished, true),
          ),
        );
      if (!target) throw new NotFoundException('Published branch not found');
    }
    const page = parse(
      z.coerce.number().int().min(1).max(10000),
      query.page ?? 1,
    );
    const pageSize = parse(
      z.coerce.number().int().min(1).max(100),
      query.pageSize ?? 12,
    );
    const search = query.search
      ? parse(z.string().trim().max(200), query.search)
      : '';
    const filter = and(
      publicGate(),
      eq(videos.contentKind, 'GENERAL_EDUCATION'),
      query.category
        ? eq(categories.slug, parse(z.string().max(120), query.category))
        : undefined,
      query.branch
        ? or(
            eq(videos.visibilityScope, 'ALL_BRANCHES'),
            eq(branches.slug, parse(z.string().max(120), query.branch)),
          )
        : undefined,
      search
        ? or(
            ilike(
              videos.titleEn,
              '%' + search.replace(/[%_\\]/g, '\\$&') + '%',
            ),
            ilike(
              videos.titleAr,
              '%' + search.replace(/[%_\\]/g, '\\$&') + '%',
            ),
          )
        : undefined,
    );
    const rows = await this.publicQuery()
      .where(filter)
      .orderBy(desc(videos.publishedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const [count] = await this.database.db
      .select({ count: sql<number>`count(*)::int` })
      .from(videos)
      .innerJoin(categories, eq(categories.id, videos.categoryId))
      .innerJoin(branches, eq(branches.id, videos.branchId))
      .innerJoin(uploads, eq(uploads.id, videos.currentUploadId))
      .where(filter);
    return {
      items: await Promise.all(rows.map((r) => this.publicDto(r))),
      total: count.count,
      page,
      pageSize,
    };
  }
  async publicDetail(slugValue: string) {
    parse(z.string().regex(/^[a-z0-9-]{1,120}$/), slugValue);
    const [row] = await this.publicQuery()
      .where(and(publicGate(), eq(videos.slug, slugValue)))
      .limit(1);
    if (!row) throw new NotFoundException('Video not found');
    return this.publicDto(row);
  }
  async deliver(
    req: Request,
    res: Response,
    videoOrSlug: string,
    type: string,
    session?: StaffSession,
  ) {
    const mapping: Record<string, typeof assets.$inferSelect.assetType> = {
      playback: 'PLAYBACK',
      thumbnail: 'THUMBNAIL',
      'captions-en': 'CAPTIONS_EN',
      'captions-ar': 'CAPTIONS_AR',
    };
    const assetType = mapping[type];
    if (!assetType) throw new NotFoundException('Asset not found');
    const v = session
      ? await this.database.db.transaction(async (tx) =>
          this.authorized(tx, await this.actor(tx, session), videoOrSlug),
        )
      : await this.publicDetail(videoOrSlug).then(async (p) => {
          const [row] = await this.database.db
            .select()
            .from(videos)
            .where(eq(videos.id, p.id));
          return row;
        });
    const [asset] = await this.database.db
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.videoId, v.id),
          eq(assets.uploadId, v.currentUploadId!),
          eq(assets.assetType, assetType),
          eq(assets.processingStatus, 'READY'),
        ),
      );
    if (!asset) throw new NotFoundException('Asset not found');
    const stat = await fs
      .stat(this.storage.path(asset.storageKey))
      .catch(() => null);
    if (!stat?.isFile()) throw new NotFoundException('Asset unavailable');
    const size = stat.size;
    res.set({
      'Content-Type': asset.mimeType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, no-store',
      'Content-Security-Policy': "default-src 'none'",
      'Cross-Origin-Resource-Policy': 'cross-origin',
    });
    let start = 0,
      end = size - 1;
    const range = req.headers.range;
    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!m || (!m[1] && !m[2])) {
        res
          .status(416)
          .set('Content-Range', 'bytes */' + size)
          .end();
        return;
      }
      if (!m[1]) start = Math.max(0, size - Number(m[2]));
      else {
        start = Number(m[1]);
        if (m[2]) end = Math.min(size - 1, Number(m[2]));
      }
      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start > end ||
        start >= size
      ) {
        res
          .status(416)
          .set('Content-Range', 'bytes */' + size)
          .end();
        return;
      }
      res.status(206).set('Content-Range', `bytes ${start}-${end}/${size}`);
    }
    res.set('Content-Length', String(end - start + 1));
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    const stream = this.storage.read(asset.storageKey, { start, end });
    res.on('close', () => stream.destroy());
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  }
  async event(slugValue: string, input: unknown, req: Request) {
    const data = parse(
      z
        .object({
          eventType: z.enum([
            'VIEW',
            'COMPLETE',
            'CONTACT',
            'WHATSAPP',
            'DIRECTIONS',
          ]),
        })
        .strict(),
      input,
    );
    const v = await this.publicDetail(slugValue);
    if (
      /bot|crawler|spider|headless|curl|wget/i.test(
        req.headers['user-agent'] ?? '',
      )
    )
      return { accepted: false };
    const now = Date.now();
    for (const [k, until] of this.signals)
      if (until < now) this.signals.delete(k);
    if (this.signals.size > 10000) return { accepted: false };
    const key = createHmac('sha256', this.eventSecret)
      .update((req.ip ?? '') + '|' + v.id + '|' + data.eventType)
      .digest('hex');
    if ((this.signals.get(key) ?? 0) > now) return { accepted: false };
    this.signals.set(key, now + 60000);
    await this.database.db.insert(events).values({
      videoId: v.id,
      branchId: v.branch.id,
      eventType: data.eventType,
    });
    return { accepted: true };
  }
  analytics(session: StaffSession) {
    return this.database.db.transaction(async (tx) => {
      const user = await this.actor(tx, session, [
        'SUPER_ADMIN',
        'BRANCH_ADMIN',
      ]);
      const scope =
        user.role === 'SUPER_ADMIN'
          ? undefined
          : sql`EXISTS (SELECT 1 FROM branch_memberships m WHERE m.user_id=${user.id} AND m.branch_id=${videos.branchId})`;
      return tx
        .select({
          categoryId: videos.categoryId,
          categoryTitle: categories.titleEn,
          branchId: videos.branchId,
          eventType: events.eventType,
          count: sql<number>`count(*)::int`,
        })
        .from(events)
        .innerJoin(videos, eq(videos.id, events.videoId))
        .innerJoin(categories, eq(categories.id, videos.categoryId))
        .where(scope)
        .groupBy(
          videos.categoryId,
          categories.titleEn,
          videos.branchId,
          events.eventType,
        );
    });
  }
}
