import { sql } from 'drizzle-orm';
import type { ApprovedService, OpeningPeriod } from '@gulf/shared';
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  check,
  pgEnum,
  primaryKey,
  index,
  jsonb,
} from 'drizzle-orm/pg-core';
export const branches = pgTable(
  'branches',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    nameEn: varchar('name_en', { length: 160 }).notNull(),
    nameAr: varchar('name_ar', { length: 160 }).notNull(),
    slug: varchar('slug', { length: 120 }).notNull().unique(),
    addressEn: text('address_en').notNull(),
    addressAr: text('address_ar').notNull(),
    city: varchar('city', { length: 100 }).notNull(),
    district: varchar('district', { length: 100 }).notNull(),
    country: varchar('country', { length: 2 }).notNull().default('SA'),
    phone: varchar('phone', { length: 30 }).notNull(),
    whatsappUrl: text('whatsapp_url').notNull(),
    mapsUrl: text('maps_url').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    isPublished: boolean('is_published').notNull().default(false),
    descriptionEn: text('description_en').notNull().default(''),
    descriptionAr: text('description_ar').notNull().default(''),
    contactNameEn: varchar('contact_name_en', { length: 160 })
      .notNull()
      .default(''),
    contactNameAr: varchar('contact_name_ar', { length: 160 })
      .notNull()
      .default(''),
    postalCode: varchar('postal_code', { length: 20 }).notNull().default(''),
    openingHours: jsonb('opening_hours')
      .$type<OpeningPeriod[]>()
      .notNull()
      .default([]),
    services: jsonb('services')
      .$type<ApprovedService[]>()
      .notNull()
      .default([]),
    publicUpdatedAt: timestamp('public_updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('branches_publication_idx').on(t.isActive, t.isPublished),
    check(
      'branches_content_arrays',
      sql`jsonb_typeof(${t.openingHours}) = 'array' AND jsonb_typeof(${t.services}) = 'array'`,
    ),
    check('branches_slug_format', sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check('branches_country_format', sql`${t.country} ~ '^[A-Z]{2}$'`),
    check(
      'branches_https_urls',
      sql`${t.whatsappUrl} LIKE 'https://%' AND ${t.mapsUrl} LIKE 'https://%'`,
    ),
  ],
);

export const staffRole = pgEnum('staff_role', [
  'SUPER_ADMIN',
  'BRANCH_ADMIN',
  'PHARMACIST',
  'MEDICAL_REVIEWER',
]);
export const staffUsers = pgTable(
  'staff_users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    username: varchar('username', { length: 80 }).notNull().unique(),
    displayName: varchar('display_name', { length: 160 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    role: staffRole('role').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    check(
      'staff_username_format',
      sql`${t.username} ~ '^[a-z0-9][a-z0-9._-]{2,79}$'`,
    ),
  ],
);

export const branchMemberships = pgTable(
  'branch_memberships',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => staffUsers.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.branchId] }),
    index('memberships_branch_idx').on(t.branchId),
  ],
);

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => staffUsers.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('sessions_user_idx').on(t.userId),
    index('sessions_expiry_idx').on(t.expiresAt),
    check('sessions_expiry_valid', sql`${t.expiresAt} > ${t.createdAt}`),
  ],
);

export const adminAuditLogs = pgTable(
  'admin_audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorId: uuid('actor_id').references(() => staffUsers.id, {
      onDelete: 'set null',
    }),
    action: varchar('action', { length: 80 }).notNull(),
    targetId: uuid('target_id'),
    details: jsonb('details')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('audit_actor_idx').on(t.actorId),
    index('audit_created_idx').on(t.createdAt),
  ],
);
