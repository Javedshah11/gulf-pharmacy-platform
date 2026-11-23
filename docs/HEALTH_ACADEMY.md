# Gulf Health Academy — Phase 4

The Academy extends the existing Next.js/NestJS platform, staff sessions, branch memberships, and audit log. It has no AI approvals, automated marketing, customer messaging, paid video hosting, or seeded medical videos.

## Architecture and files

```text
apps/api/src/videos/             validated contracts, REST controllers, workflow and scoped authorization
apps/worker/src/main.ts          dedicated BullMQ worker and durable upload dispatcher
apps/web/app/[locale]/health-academy/   bilingual library and video detail
apps/web/app/media/health-academy/     controlled same-origin public media proxy
apps/web/app/admin/(protected)/videos/ staff video routes
apps/web/features/health-academy/       public cards, player, event signals
apps/web/features/video-management/    draft, upload, review, category and analytics UI
packages/shared/src/videos.ts          public and staff video contracts
packages/database/src/health-schema.ts additive Academy schema
packages/database/drizzle/0003_young_dakota_north.sql new migration
packages/media/src/                    config, private storage, FFmpeg processor and queue
apps/api/test/academy.test.cjs          real PostgreSQL/Redis/FFmpeg workflow and security
apps/api/test/support/academy.cjs       disposable users, media and queue
tests/browser/academy.spec.ts          real production frontend and complete staff workflow
```

Migration 0003 adds nine Academy tables. Phase 4 activates the pharmacist/reviewer role values already reserved by migration 0001. It does not rewrite migrations 0000–0002 or update existing branch/staff content. The category seed inserts eight bilingual suggestions with `onConflictDoNothing`; existing category edits and the confirmed Dammam branch are preserved. No video is seeded.

## Public API

All paths have prefix `/api/health-academy`:

| Method and path                       | Contract                                                                                                               |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| GET `/categories`                     | Active bilingual categories in administrator-defined order                                                             |
| GET `/videos`                         | `{items,total,page,pageSize}`; `page` ≥1, `pageSize` 1–100 (default 12), optional `search`, category slug, branch slug |
| GET `/videos/:slug`                   | Eligible public fields, processed media availability, references and explicitly authorized author attribution          |
| GET/HEAD `/videos/:slug/assets/:type` | `playback`, `thumbnail`, `captions-en`, `captions-ar`; single byte range, 206/416 support                              |
| POST `/videos/:slug/events`           | `{eventType: VIEW\|COMPLETE\|CONTACT\|WHATSAPP\|DIRECTIONS}` with exact configured Origin and `X-Gulf-Request: public` |

No endpoint exposes original uploads, storage keys, passwords, review notes, reviewer assignments, approval references, or private asset URLs to public visitors. Unavailable/unpublished/expired videos return 404. Media responses use `no-store`, including at the Next proxy, so archiving and approval expiry affect future media requests. Bytes already delivered to a browser cannot be recalled.

## Staff API

Existing session cookies and `X-Gulf-Request: admin` with exact configured Origin remain required. JSON bodies reject unknown fields. IDs are UUIDs. New paths use `/api/admin`:

| Method and path                                             | Purpose                                                                                                                                         |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| GET `/academy/branches`                                     | Active branches authorized for the current staff member                                                                                         |
| POST `/academy/staff`                                       | Super Admin creates PHARMACIST or MEDICAL_REVIEWER using username, displayName, password (15–128), role, branchIds                              |
| GET/POST `/videos`                                          | Scoped list with real status counters / pharmacist draft creation                                                                               |
| GET/PATCH `/videos/:id`                                     | Scoped metadata, processing status, safe asset metadata, reviewer feedback / full metadata revision                                             |
| PUT `/videos/:id/upload`                                    | Pharmacist raw MP4/MOV upload, required Content-Length, progress supported by browser XHR                                                       |
| PUT `/videos/:id/captions`                                  | Pharmacist `{locale: en\|ar,text: WEBVTT}`; plain text, bounded cues and size                                                                   |
| GET/HEAD `/videos/:id/assets/:type`                         | Scoped private processed previews; original sources never delivered                                                                             |
| POST `/videos/:id/retry`                                    | Failed job retry (maximum five manual retries), durable queue dispatch                                                                          |
| POST `/videos/:id/reviewers`                                | Super Admin assigns `{reviewerId}` with source branch membership                                                                                |
| POST `/videos/:id/submit`                                   | Submit a processed revision with bilingual descriptions and references                                                                          |
| POST `/videos/:id/medical-review`                           | Assigned independent reviewer records decision and comments                                                                                     |
| POST `/videos/:id/compliance-review`                        | Independent Super Admin records separate compliance decision, comments, optional authorization reference, ISO validity and attribution approval |
| POST `/videos/:id/publish`                                  | Super Admin; every current approval/media/branch/category gate must pass                                                                        |
| POST `/videos/:id/archive`                                  | Super Admin removes public access and sitemap eligibility                                                                                       |
| GET/POST `/videos/categories`, PUT `/videos/categories/:id` | Staff category list; Super Admin create/update bilingual titles, descriptions, slug, active state and order                                     |
| GET `/videos/analytics`                                     | Super Admin or scoped Branch Admin; aggregate counts by category, source branch and event type                                                  |

Draft/metadata body: `slug,titleEn,titleAr,descriptionEn,descriptionAr,categoryId,branchId,visibilityScope` (`BRANCH` or `ALL_BRANCHES`), `contentKind` (`GENERAL_EDUCATION` or `REGULATED_PROMOTION`), `references:[{sourceTitle,sourceUrl}]`. URLs must be HTTPS; the server never fetches supplied references. Source branch is fixed after draft creation.

## Website and SEO

The English and Arabic library supports title search, category filters and pagination. Branch filtering is also available through the API/query string. Detail pages use controlled MP4 playback, provided VTT captions, references, a healthcare education disclaimer, optional authorized author name, related education and branch contacts. Content is authored and reviewed by real staff; no credentials are invented.

General educational videos receive canonical/hreflang metadata, actual duration/thumbnail VideoObject data and sitemap entries only when eligible. Promotions are separately classified, omitted from educational library/sitemap, labeled on direct detail pages and marked noindex. `SITE_ORIGIN` must be an explicitly configured public HTTPS origin; local development remains noindex without a fabricated domain. Existing branch SEO remains in place.

## Analytics and privacy

VIEW means the player's first play event in a mounted page; COMPLETE means its ended event. CONTACT, WHATSAPP and DIRECTIONS mean the corresponding branch-link click from a video page. These are aggregate engagement **signals**, not unique visitors or verified human engagement. The client sends events without credentials, and playback does not await analytics.

The database stores only video ID, source branch ID, event type and timestamp. There are no patient details, cookies for tracking, medical profiles, persistent visitor IDs or database IP addresses. A process-local secret HMAC of network address/video/event limits repeat signals for 60 seconds; entries expire and the map is bounded at 10,000. Obvious automated user agents are ignored. This baseline is per API instance; horizontally scaled deployments need a shared ephemeral rate limiter. Category popularity is derived from recorded event rows. The existing login Redis rate limiter remains unchanged.

See [VIDEO_WORKFLOW.md](VIDEO_WORKFLOW.md), [VIDEO_STORAGE.md](VIDEO_STORAGE.md), [MEDICAL_REVIEW.md](MEDICAL_REVIEW.md) and [PHASE_4_VALIDATION.md](PHASE_4_VALIDATION.md).
