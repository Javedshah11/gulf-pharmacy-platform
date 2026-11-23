import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
const text = (max: number) => z.string().trim().min(1).max(max);
export const id = z.uuid();
export const slug = text(120).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
export const categoryInput = z
  .object({
    slug,
    titleEn: text(160),
    titleAr: text(160),
    descriptionEn: z.string().trim().max(2000).default(''),
    descriptionAr: z.string().trim().max(2000).default(''),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().min(0).max(10000).default(0),
  })
  .strict();
export const videoInput = z
  .object({
    slug,
    titleEn: text(200),
    titleAr: text(200),
    descriptionEn: z.string().trim().max(10000).default(''),
    descriptionAr: z.string().trim().max(10000).default(''),
    categoryId: id,
    branchId: id,
    visibilityScope: z.enum(['BRANCH', 'ALL_BRANCHES']).default('BRANCH'),
    contentKind: z
      .enum(['GENERAL_EDUCATION', 'REGULATED_PROMOTION'])
      .default('GENERAL_EDUCATION'),
    references: z
      .array(
        z
          .object({
            sourceTitle: text(200),
            sourceUrl: z
              .url()
              .max(2000)
              .refine((v) => new URL(v).protocol === 'https:'),
          })
          .strict(),
      )
      .max(30)
      .default([]),
  })
  .strict();
export const decisionInput = z
  .object({
    decision: z.enum([
      'APPROVE',
      'REJECT',
      'CHANGES_REQUESTED',
      'NOT_REQUIRED',
    ]),
    comments: text(5000),
    approvalReference: text(300).optional(),
    validUntil: z.iso.datetime().optional(),
    authorAttributionApproved: z.boolean().optional(),
  })
  .strict();
export const staffInput = z
  .object({
    username: text(80).regex(/^[a-z0-9][a-z0-9._-]{2,79}$/),
    displayName: text(160),
    password: z.string().min(15).max(128),
    role: z.enum(['PHARMACIST', 'MEDICAL_REVIEWER']),
    branchIds: z.array(id).min(1).max(100),
  })
  .strict();
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new BadRequestException(
      result.error.issues.map((i) => i.path.join('.') + ': ' + i.message),
    );
  return result.data;
}
