import { z } from 'zod';
export { parse, id } from '../videos/contracts';
const text = (max: number) => z.string().trim().min(1).max(max);
export const branchSlug = text(120).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
export const campaignInput = z
  .object({
    branchId: z.uuid(),
    slug: branchSlug,
    titleEn: text(200),
    titleAr: text(200),
    bodyEn: text(5000),
    bodyAr: text(5000),
    campaignType: z.enum([
      'AWARENESS',
      'EDUCATION',
      'ANNOUNCEMENT',
      'PROMOTION',
    ]),
    videoId: z.uuid().nullable().default(null),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
  })
  .strict()
  .refine((v) => new Date(v.endsAt) > new Date(v.startsAt), {
    message: 'End must follow start',
  })
  .refine((v) => v.campaignType !== 'EDUCATION' || Boolean(v.videoId), {
    message: 'Education campaigns require an approved Academy video',
  });
export const faqInput = z
  .object({
    branchId: z.uuid(),
    questionEn: text(300),
    questionAr: text(300),
    answerEn: text(3000),
    answerAr: text(3000),
    videoId: z.uuid().nullable().default(null),
  })
  .strict();
export const qrInput = z
  .object({
    branchId: z.uuid(),
    campaignId: z.uuid().nullable().default(null),
    label: text(160),
    destination: z.enum(['WEBSITE', 'WHATSAPP', 'MAPS']),
    source: z.enum(['BUSINESS_CARD', 'COUNTER', 'BAG', 'POSTER', 'EVENT']),
  })
  .strict();
export const reviewInput = z
  .object({
    kind: z.enum(['MEDICAL', 'COMPLIANCE']),
    decision: z.enum([
      'APPROVE',
      'NOT_REQUIRED',
      'CHANGES_REQUESTED',
      'REJECT',
    ]),
    comments: text(5000),
    approvalReference: text(300).optional(),
    validUntil: z.iso.datetime().optional(),
  })
  .strict();
export const contextInput = z
  .object({
    branchSlug: branchSlug.optional(),
    qrCode: z
      .string()
      .regex(/^[a-f0-9]{24}$/)
      .optional(),
    campaignSlug: branchSlug.optional(),
    videoSlug: branchSlug.optional(),
  })
  .strict();
export const subscriptionInput = z
  .object({
    branchSlug,
    phone: z.string().regex(/^\+9665\d{8}$/),
    locale: z.enum(['en', 'ar']),
    consent: z.literal(true),
    consentVersion: z.literal('gulf-whatsapp-2026-11-v1'),
    scopes: z
      .array(z.enum(['ANNOUNCEMENTS', 'EDUCATION', 'PROMOTIONS']))
      .min(1)
      .max(3),
    qrCode: z
      .string()
      .regex(/^[a-f0-9]{24}$/)
      .optional(),
  })
  .strict();
export const tokenInput = z
  .object({
    requestId: z.uuid(),
    managementToken: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
