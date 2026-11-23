import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  index,
  uniqueIndex,
  check,
  jsonb,
} from 'drizzle-orm/pg-core';
import { branches, staffUsers } from './schema';
import { healthVideos } from './health-schema';
const stamp = (name: string) =>
  timestamp(name, { withTimezone: true }).notNull().defaultNow();
const approval = () => ({
  revision: integer('revision').notNull().default(1),
  status: varchar('status', { length: 24 }).notNull().default('DRAFT'),
  reviewerId: uuid('reviewer_id').references(() => staffUsers.id),
  medicalRevision: integer('medical_revision'),
  complianceRevision: integer('compliance_revision'),
  approvalReference: varchar('approval_reference', { length: 300 }),
  validUntil: timestamp('valid_until', { withTimezone: true }),
});
export const assistantFaqs = pgTable(
  'assistant_faqs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id),
    authorId: uuid('author_id')
      .notNull()
      .references(() => staffUsers.id),
    questionEn: varchar('question_en', { length: 300 }).notNull(),
    questionAr: varchar('question_ar', { length: 300 }).notNull(),
    answerEn: text('answer_en').notNull(),
    answerAr: text('answer_ar').notNull(),
    videoId: uuid('video_id').references(() => healthVideos.id),
    ...approval(),
    createdAt: stamp('created_at'),
    updatedAt: stamp('updated_at').$onUpdate(() => new Date()),
  },
  (t) => [
    index('assistant_faq_public').on(t.branchId, t.status),
    check(
      'assistant_faq_status',
      sql`${t.status} IN ('DRAFT','PENDING_REVIEW','CHANGES_REQUESTED','REJECTED','APPROVED','PUBLISHED','ARCHIVED')`,
    ),
  ],
);
export const marketingCampaigns = pgTable(
  'marketing_campaigns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id),
    authorId: uuid('author_id')
      .notNull()
      .references(() => staffUsers.id),
    slug: varchar('slug', { length: 120 }).unique().notNull(),
    titleEn: varchar('title_en', { length: 200 }).notNull(),
    titleAr: varchar('title_ar', { length: 200 }).notNull(),
    bodyEn: text('body_en').notNull(),
    bodyAr: text('body_ar').notNull(),
    campaignType: varchar('campaign_type', { length: 24 }).notNull(),
    videoId: uuid('video_id').references(() => healthVideos.id),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    ...approval(),
    createdAt: stamp('created_at'),
    updatedAt: stamp('updated_at').$onUpdate(() => new Date()),
  },
  (t) => [
    index('marketing_campaign_public').on(t.status, t.startsAt, t.endsAt),
    index('marketing_campaign_branch').on(t.branchId),
    check('marketing_campaign_dates', sql`${t.endsAt} > ${t.startsAt}`),
    check(
      'marketing_campaign_slug',
      sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`,
    ),
    check(
      'marketing_campaign_type',
      sql`${t.campaignType} IN ('AWARENESS','EDUCATION','ANNOUNCEMENT','PROMOTION')`,
    ),
    check(
      'marketing_campaign_status',
      sql`${t.status} IN ('DRAFT','PENDING_REVIEW','CHANGES_REQUESTED','REJECTED','APPROVED','SCHEDULED','ACTIVE','PAUSED','COMPLETED')`,
    ),
  ],
);
export const marketingReviews = pgTable(
  'marketing_campaign_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id').references(() => marketingCampaigns.id),
    faqId: uuid('faq_id').references(() => assistantFaqs.id),
    reviewerId: uuid('reviewer_id')
      .notNull()
      .references(() => staffUsers.id),
    revision: integer('revision').notNull(),
    kind: varchar('kind', { length: 20 }).notNull(),
    decision: varchar('decision', { length: 24 }).notNull(),
    comments: text('comments').notNull(),
    approvalReference: varchar('approval_reference', { length: 300 }),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    snapshot: jsonb('snapshot').$type<Record<string, unknown>>().notNull(),
    createdAt: stamp('created_at'),
  },
  (t) => [
    index('marketing_reviews_campaign').on(t.campaignId, t.revision),
    index('marketing_reviews_faq').on(t.faqId, t.revision),
    check(
      'marketing_review_target',
      sql`(${t.campaignId} IS NULL) <> (${t.faqId} IS NULL)`,
    ),
    check(
      'marketing_review_kind',
      sql`${t.kind} IN ('MEDICAL','COMPLIANCE') AND ${t.decision} IN ('APPROVE','NOT_REQUIRED','REJECT','CHANGES_REQUESTED')`,
    ),
  ],
);
export const qrCampaigns = pgTable(
  'qr_campaigns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 40 }).notNull().unique(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id),
    campaignId: uuid('campaign_id').references(() => marketingCampaigns.id),
    label: varchar('label', { length: 160 }).notNull(),
    destination: varchar('destination', { length: 20 }).notNull(),
    source: varchar('source', { length: 24 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => staffUsers.id),
    createdAt: stamp('created_at'),
  },
  (t) => [
    index('qr_branch').on(t.branchId),
    check(
      'qr_destination',
      sql`${t.destination} IN ('WEBSITE','WHATSAPP','MAPS')`,
    ),
    check(
      'qr_source',
      sql`${t.source} IN ('BUSINESS_CARD','COUNTER','BAG','POSTER','EVENT')`,
    ),
  ],
);
export const marketingSubscriptions = pgTable(
  'marketing_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id),
    contactHash: varchar('contact_hash', { length: 64 }).notNull(),
    contactCipher: text('contact_cipher'),
    state: varchar('state', { length: 20 }).notNull().default('UNVERIFIED'),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    createdAt: stamp('created_at'),
    updatedAt: stamp('updated_at').$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('marketing_contact_branch').on(t.branchId, t.contactHash),
    check(
      'subscription_state',
      sql`${t.state} IN ('UNVERIFIED','CONFIRMED','WITHDRAWN')`,
    ),
  ],
);
export const subscriptionRequests = pgTable(
  'marketing_subscription_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subscriptionId: uuid('subscription_id')
      .notNull()
      .references(() => marketingSubscriptions.id),
    codeHash: varchar('code_hash', { length: 64 }).notNull(),
    manageHash: varchar('manage_hash', { length: 64 }).notNull().unique(),
    locale: varchar('locale', { length: 2 }).notNull(),
    scopes: jsonb('scopes').$type<string[]>().notNull(),
    consentVersion: varchar('consent_version', { length: 40 }).notNull(),
    source: varchar('source', { length: 24 }).notNull(),
    qrId: uuid('qr_id').references(() => qrCampaigns.id),
    status: varchar('status', { length: 20 }).notNull().default('PENDING'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: stamp('created_at'),
  },
  (t) => [
    index('subscription_request_lookup').on(t.subscriptionId, t.status),
    check(
      'subscription_request_status',
      sql`${t.status} IN ('PENDING','CONFIRMED','WITHDRAWN','EXPIRED')`,
    ),
  ],
);
export const marketingConsents = pgTable(
  'marketing_consents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subscriptionId: uuid('subscription_id')
      .notNull()
      .references(() => marketingSubscriptions.id),
    requestId: uuid('request_id')
      .notNull()
      .references(() => subscriptionRequests.id),
    kind: varchar('kind', { length: 20 }).notNull(),
    version: varchar('version', { length: 40 }).notNull(),
    locale: varchar('locale', { length: 2 }).notNull(),
    scopes: jsonb('scopes').$type<string[]>().notNull(),
    source: varchar('source', { length: 32 }).notNull(),
    verifiedBy: uuid('verified_by').references(() => staffUsers.id),
    createdAt: stamp('created_at'),
  },
  (t) => [
    uniqueIndex('marketing_consent_idempotent').on(t.requestId, t.kind),
    index('marketing_consent_history').on(t.subscriptionId, t.createdAt),
  ],
);
export const marketingSuppressions = pgTable(
  'marketing_suppressions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id),
    contactHash: varchar('contact_hash', { length: 64 }).notNull(),
    reason: varchar('reason', { length: 32 }).notNull(),
    createdAt: stamp('created_at'),
  },
  (t) => [
    uniqueIndex('marketing_suppression_unique').on(t.branchId, t.contactHash),
  ],
);
export const marketingEvents = pgTable(
  'marketing_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id').references(() => branches.id),
    campaignId: uuid('campaign_id').references(() => marketingCampaigns.id),
    qrId: uuid('qr_id').references(() => qrCampaigns.id),
    source: varchar('source', { length: 24 }).notNull(),
    eventType: varchar('event_type', { length: 24 }).notNull(),
    createdAt: stamp('created_at'),
  },
  (t) => [
    index('marketing_events_report').on(t.branchId, t.campaignId, t.createdAt),
    check(
      'marketing_event_type',
      sql`${t.eventType} IN ('VISIT','QR_SCAN','WHATSAPP','DIRECTIONS','CALL','ASSISTANT','VIDEO_CONTACT','CAMPAIGN_VIEW')`,
    ),
  ],
);
export const assistantFeedback = pgTable('assistant_feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  faqId: uuid('faq_id')
    .notNull()
    .references(() => assistantFaqs.id),
  helpful: boolean('helpful').notNull(),
  createdAt: stamp('created_at'),
});
export const outboundMessageJobs = pgTable(
  'outbound_message_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => marketingCampaigns.id),
    subscriptionId: uuid('subscription_id')
      .notNull()
      .references(() => marketingSubscriptions.id),
    approvedBy: uuid('approved_by')
      .notNull()
      .references(() => staffUsers.id),
    templateName: varchar('template_name', { length: 160 }).notNull(),
    providerMessageId: varchar('provider_message_id', { length: 200 }).unique(),
    state: varchar('state', { length: 20 }).notNull().default('DISABLED'),
    costMinor: integer('cost_minor').notNull().default(0),
    createdAt: stamp('created_at'),
    updatedAt: stamp('updated_at').$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('outbound_idempotent').on(
      t.campaignId,
      t.subscriptionId,
      t.templateName,
    ),
  ],
);
export const messagingWebhookReceipts = pgTable('messaging_webhook_receipts', {
  id: varchar('id', { length: 64 }).primaryKey(),
  createdAt: stamp('created_at'),
});
