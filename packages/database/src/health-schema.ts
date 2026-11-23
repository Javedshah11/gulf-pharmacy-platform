import { sql } from 'drizzle-orm';
import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  bigint,
  timestamp,
  index,
  uniqueIndex,
  check,
  jsonb,
  primaryKey,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { VIDEO_STATUSES, ASSET_TYPES } from '@gulf/shared';
import { branches, staffUsers } from './schema';
const stamp = (name: string) =>
  timestamp(name, { withTimezone: true }).notNull().defaultNow();
export const healthVideoStatus = pgEnum('health_video_status', VIDEO_STATUSES);
export const healthAssetType = pgEnum('health_asset_type', ASSET_TYPES);
export const healthReviewStatus = pgEnum('health_review_status', [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CHANGES_REQUESTED',
]);
export const healthVideoCategories = pgTable(
  'health_video_categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 120 }).notNull().unique(),
    titleEn: varchar('title_en', { length: 160 }).notNull(),
    titleAr: varchar('title_ar', { length: 160 }).notNull(),
    descriptionEn: text('description_en').notNull().default(''),
    descriptionAr: text('description_ar').notNull().default(''),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: stamp('created_at'),
    updatedAt: stamp('updated_at').$onUpdate(() => new Date()),
  },
  (t) => [
    check('health_category_slug', sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    index('health_category_order').on(t.isActive, t.sortOrder),
  ],
);
export const healthVideos = pgTable(
  'health_videos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 120 }).notNull().unique(),
    titleEn: varchar('title_en', { length: 200 }).notNull(),
    titleAr: varchar('title_ar', { length: 200 }).notNull(),
    descriptionEn: text('description_en').notNull().default(''),
    descriptionAr: text('description_ar').notNull().default(''),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => healthVideoCategories.id),
    authorId: uuid('author_id')
      .notNull()
      .references(() => staffUsers.id),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id),
    visibilityScope: varchar('visibility_scope', { length: 20 })
      .notNull()
      .default('BRANCH'),
    contentKind: varchar('content_kind', { length: 25 })
      .notNull()
      .default('GENERAL_EDUCATION'),
    status: healthVideoStatus('status').notNull().default('DRAFT'),
    revision: integer('revision').notNull().default(1),
    medicalReviewStatus: healthReviewStatus('medical_review_status')
      .notNull()
      .default('PENDING'),
    complianceStatus: healthReviewStatus('compliance_status')
      .notNull()
      .default('PENDING'),
    medicalRevision: integer('medical_revision'),
    complianceRevision: integer('compliance_revision'),
    complianceReference: varchar('compliance_reference', { length: 300 }),
    complianceValidUntil: timestamp('compliance_valid_until', {
      withTimezone: true,
    }),
    authorAttributionApproved: boolean('author_attribution_approved')
      .notNull()
      .default(false),
    currentUploadId: uuid('current_upload_id').references(
      (): AnyPgColumn => healthVideoUploads.id,
    ),
    durationSeconds: integer('duration_seconds'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: stamp('created_at'),
    updatedAt: stamp('updated_at').$onUpdate(() => new Date()),
  },
  (t) => [
    index('health_video_public').on(t.status, t.publishedAt),
    index('health_video_scope').on(t.branchId, t.authorId),
    index('health_video_category').on(t.categoryId),
    check(
      'health_video_scope_values',
      sql`${t.visibilityScope} IN ('BRANCH','ALL_BRANCHES') AND ${t.contentKind} IN ('GENERAL_EDUCATION','REGULATED_PROMOTION')`,
    ),
    check('health_video_revision_positive', sql`${t.revision} > 0`),
    check('health_video_slug', sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
  ],
);
export const healthVideoUploads = pgTable(
  'health_video_uploads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    videoId: uuid('video_id')
      .notNull()
      .references(() => healthVideos.id),
    state: varchar('state', { length: 20 }).notNull().default('STREAMING'),
    reservedBytes: bigint('reserved_bytes', { mode: 'number' }).notNull(),
    expectedBytes: bigint('expected_bytes', { mode: 'number' }).notNull(),
    retryCount: integer('retry_count').notNull().default(0),
    errorCode: varchar('error_code', { length: 80 }),
    checksum: varchar('checksum', { length: 64 }),
    createdAt: stamp('created_at'),
    updatedAt: stamp('updated_at').$onUpdate(() => new Date()),
  },
  (t) => [
    index('health_upload_pending').on(t.state, t.updatedAt),
    check(
      'health_upload_bounds',
      sql`${t.reservedBytes} >= 0 AND ${t.expectedBytes} > 0 AND ${t.retryCount} >= 0`,
    ),
  ],
);
export const healthVideoAssets = pgTable(
  'health_video_assets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    videoId: uuid('video_id')
      .notNull()
      .references(() => healthVideos.id),
    uploadId: uuid('upload_id')
      .notNull()
      .references(() => healthVideoUploads.id),
    assetType: healthAssetType('asset_type').notNull(),
    storageKey: text('storage_key').notNull().unique(),
    mimeType: varchar('mime_type', { length: 80 }).notNull(),
    fileSize: bigint('file_size', { mode: 'number' }).notNull(),
    processingStatus: varchar('processing_status', { length: 20 })
      .notNull()
      .default('READY'),
    width: integer('width'),
    height: integer('height'),
    durationSeconds: integer('duration_seconds'),
    createdAt: stamp('created_at'),
  },
  (t) => [
    uniqueIndex('health_asset_unique').on(t.uploadId, t.assetType),
    index('health_asset_video').on(t.videoId),
    check('health_asset_size', sql`${t.fileSize} > 0`),
  ],
);
export const healthVideoReviews = pgTable(
  'health_video_reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    videoId: uuid('video_id')
      .notNull()
      .references(() => healthVideos.id),
    reviewerId: uuid('reviewer_id')
      .notNull()
      .references(() => staffUsers.id),
    revision: integer('revision').notNull(),
    kind: varchar('kind', { length: 20 }).notNull(),
    decision: varchar('decision', { length: 30 }).notNull(),
    comments: text('comments').notNull(),
    approvalReference: varchar('approval_reference', { length: 300 }),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    reviewedAt: stamp('reviewed_at'),
  },
  (t) => [
    index('health_reviews_history').on(t.videoId, t.revision),
    check(
      'health_review_kind',
      sql`${t.kind} IN ('MEDICAL','COMPLIANCE') AND ${t.decision} IN ('APPROVE','REJECT','CHANGES_REQUESTED','NOT_REQUIRED')`,
    ),
  ],
);
export const healthVideoReferences = pgTable(
  'health_video_references',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    videoId: uuid('video_id')
      .notNull()
      .references(() => healthVideos.id),
    sourceTitle: varchar('source_title', { length: 200 }).notNull(),
    sourceUrl: text('source_url').notNull(),
    createdAt: stamp('created_at'),
  },
  (t) => [index('health_references_video').on(t.videoId)],
);
export const healthVideoReviewerAssignments = pgTable(
  'health_video_reviewer_assignments',
  {
    videoId: uuid('video_id')
      .notNull()
      .references(() => healthVideos.id),
    reviewerId: uuid('reviewer_id')
      .notNull()
      .references(() => staffUsers.id),
    assignedBy: uuid('assigned_by')
      .notNull()
      .references(() => staffUsers.id),
    createdAt: stamp('created_at'),
  },
  (t) => [primaryKey({ columns: [t.videoId, t.reviewerId] })],
);
export const healthVideoVersions = pgTable(
  'health_video_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    videoId: uuid('video_id')
      .notNull()
      .references(() => healthVideos.id),
    revision: integer('revision').notNull(),
    snapshot: jsonb('snapshot').$type<Record<string, unknown>>().notNull(),
    createdAt: stamp('created_at'),
  },
  (t) => [uniqueIndex('health_version_unique').on(t.videoId, t.revision)],
);
export const healthVideoEvents = pgTable(
  'health_video_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    videoId: uuid('video_id')
      .notNull()
      .references(() => healthVideos.id),
    branchId: uuid('branch_id').references(() => branches.id),
    eventType: varchar('event_type', { length: 20 }).notNull(),
    createdAt: stamp('created_at'),
  },
  (t) => [
    index('health_events_aggregate').on(t.videoId, t.eventType, t.createdAt),
    check(
      'health_event_values',
      sql`${t.eventType} IN ('VIEW','COMPLETE','CONTACT','WHATSAPP','DIRECTIONS')`,
    ),
  ],
);
