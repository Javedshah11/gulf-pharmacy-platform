# Phase 4 validation — Gulf Health Academy

Validation date: 23 November 2026. This extends the existing checkout and preserves its uncommitted Phase 3 work. Phase 5 was not started.

## Executed checks

| Check                              | Actual result                                                                                                                                                    |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency install                 | `pnpm install --frozen-lockfile` passed; no existing environment replaced                                                                                        |
| Additive database migration        | Generated and applied 0003; repeat `pnpm db:migrate` passed                                                                                                      |
| Initial categories                 | Insert-only seed created eight bilingual categories, zero videos                                                                                                 |
| Production build                   | All application and shared-library workspaces built, including the new media library and worker                                                                  |
| Strict type checking               | Passed all workspaces and browser/tooling TypeScript                                                                                                             |
| ESLint                             | Passed                                                                                                                                                           |
| API / security / prior regressions | **35 tests passed, zero failures, zero skips**                                                                                                                   |
| Browser verification               | **19 tests passed, zero failures, zero skips**; complete stable rerun in **3.0 minutes**                                                                         |
| Worker entry point                 | Compiled worker started using preserved API configuration and reported ready; smoke process stopped afterwards; the local worker was then started and left ready |
| Real media                         | FFmpeg/FFprobe 9.0 processed deterministic two-second 320×180 synthetic MP4, generated playback MP4 and JPEG, and served controlled byte ranges                  |

The API suite covers authenticated pharmacist authoring/upload; unauthorized roles, missing session/origin, branch/reviewer isolation; wrong media type, size limits, invalid signature and failed-upload cleanup; quota rejection; actual processing; permanent failure and bounded manual retry; transient tool failure, exhausted automatic attempts, then successful retry after correcting the environment; private draft/source exclusion; caption validation; submission; assigned independent approval; explicit self-review rejection after an author role change; requested changes/rejection/resubmission; separate compliance decisions; regulated-authorization expiry; public projections, search and ranges; analytics deduplication/bot rejection and actual aggregate rows; category disabling; revisions invalidating approvals; archiving; staff/category permission boundaries; and existing audit records. Existing authentication/session/CSRF/bootstrap, branch publication and twelve-branch capability regressions also passed.

The production-browser fixture creates actual test users, category, source video and queue in a disposable database/storage root. It uses the real staff UI to create metadata, upload, add captions, submit, medically approve, record compliance and publish. It checks both English and Arabic at 1440×1000, 820×1180 and 390×844; HTML language/direction, no horizontal overflow, player metadata and native playback, canonical URLs, real VideoObject fields, sitemap inclusion, range requests and original-source denial. Archiving then returns 404 for public detail and media. Screenshots are stored under ignored `test-results/academy-*/academy-{en,ar}-{1440,820,390}.png`; desktop and Arabic mobile layouts were visually inspected.

## Disposable demonstration

The demonstrated content is explicitly titled “Deterministic test clip”; it contains only a synthetic color, with descriptions stating it is a test and contains no medical advice. The test-only supporting source uses example.org. No fabricated educational clip, medical claim, professional identity or regulatory authorization was published in the development database.

The executed flow was pharmacist draft → private upload → real worker processing → supplied captions → review submission → assigned independent reviewer approval → separate Super Admin compliance decision → explicit publication → English/Arabic visitor playback → archive → public/media 404. Additional disposable tests exercised rejection, changes requested and regulated-content expiry.

## Preservation and local environment

Read-only verification confirmed the existing Dammam branch retains ID `6a06a427-92d9-45e3-8e1c-a547d4b342b2`, remains published, and retains zero invented hours/services. Development Academy data contains eight categories and **zero videos**. Existing administrator edits, local environment files, PostgreSQL port **55432** and Redis port **6381** were preserved. All disposable database records, private fixture directories and unique test Redis queues are removed by test cleanup.

An initial concurrent validation run hit a test-database DROP cleanup timeout. API test files now run serially and the harness gives disposable database provisioning/cleanup a separate 30-second timeout; production query limits are unchanged. The final API run passed. A browser assertion exposed ambiguous nested-select labels; shared Field controls now receive explicit localized accessible labels. Caption sanitization was corrected to allow the WEBVTT timestamp arrow while rejecting markup, unsafe control characters and out-of-duration cues. These were corrected and rerun, not deferred. During an initial full browser run, mobile public requests coincided with a development API watcher restart while final failure-state audit logging was being completed. After the API regression run finished and application code was stable, the complete browser suite was rerun: all 19 tests passed.

## Files created for Phase 4

- `packages/shared/src/videos.ts`
- `packages/database/src/health-schema.ts`, `src/academy-categories.ts`, `drizzle/0003_young_dakota_north.sql`, `drizzle/meta/0003_snapshot.json`
- `packages/media/package.json`, `tsconfig.json`, `src/config.ts`, `src/storage.ts`, `src/processor.ts`, `src/index.ts`
- `apps/worker/package.json`, `tsconfig.json`, `.env.example`, `src/main.ts`
- `apps/api/src/videos/contracts.ts`, `videos.service.ts`, `videos.controller.ts`, `videos.module.ts`
- `apps/api/test/academy.test.cjs`, `test/support/academy.cjs`
- `apps/web/lib/api/academy.ts`, `features/health-academy/academy.tsx`, `player.tsx`, `features/video-management/workspace.tsx`
- `apps/web/app/[locale]/health-academy/page.tsx`, `academy.css`, `[slug]/page.tsx`
- `apps/web/app/media/health-academy/[slug]/[type]/route.ts`
- `apps/web/app/admin/(protected)/videos/page.tsx`, `new/page.tsx`, `review/page.tsx`, `categories/page.tsx`, `[id]/page.tsx`, `[id]/edit/page.tsx`
- `tests/browser/academy.spec.ts`
- `docs/HEALTH_ACADEMY.md`, `VIDEO_WORKFLOW.md`, `VIDEO_STORAGE.md`, `MEDICAL_REVIEW.md`, `PHASE_4_VALIDATION.md`

## Existing files extended for Phase 4

- Root `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `playwright.config.ts`, `README.md`
- `packages/shared/src/index.ts`; `packages/database/src/index.ts`, `src/seed.ts`, `drizzle.config.ts`, `drizzle/meta/_journal.json`
- `apps/api/package.json`, `.env.example`, `src/app.module.ts`, `src/auth/auth.service.ts`, `src/admin/admin.service.ts`, `src/config/environment.ts`, `src/configure-app.ts`, `src/common/api-exception.filter.ts`, `test/support/harness.cjs`
- `apps/web/features/admin/provider.tsx`, `login.tsx`, `shell.tsx`, `staff.tsx`, `settings.tsx`, `ui.tsx`, `use-resource.ts`; `app/admin/admin.css`, `components/layout/header.tsx`, `app/sitemap.ts`, `app/robots.ts`
- `docs/ARCHITECTURE.md`, `AUTHENTICATION.md`, `DEPENDENCIES.md`, `DEVELOPMENT_PHASES.md`, `FOLDER_STRUCTURE.md`, `SETUP.md`, `TESTING.md`

The wider working tree also contains pre-existing Phase 3 changes. That work was preserved; the lists above identify the Phase 4 additions/extensions rather than claiming all current Git changes originated in this phase.

## Run and verification commands

Use separate PowerShell terminals for long-running applications. Existing local environment files remain authoritative.

```powershell
Set-Location C:\Users\pc\gulf-pharmacy-platform
pnpm install --frozen-lockfile
ffmpeg -version
ffprobe -version
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev

# Alternatively, one command in each application terminal:
pnpm dev:api
pnpm dev:web
pnpm dev:worker

# Compiled applications, after pnpm build, in separate terminals:
pnpm --filter @gulf/api exec node dist/main.js
pnpm --filter @gulf/web start
pnpm start:worker

# Validation (run suites sequentially on this local machine):
pnpm build
pnpm lint
pnpm typecheck
pnpm format:check
pnpm test
pnpm test:browser

# Stop each application with Ctrl+C, then optionally stop services:
pnpm db:down
```

The public library is at `/en/health-academy` or `/ar/health-academy`; staff manage content at `/admin/videos`. Start with actual staff accounts/branch memberships, assign a reviewer, then follow [VIDEO_WORKFLOW.md](VIDEO_WORKFLOW.md). See [storage configuration](VIDEO_STORAGE.md) for private storage, quota, processor limits and production isolation requirements.

No production domain, remote deployment, object storage or HLS was configured or tested; this phase implements the requested local MP4 pipeline. Public engagement signals are per-instance throttled aggregates, not verified audience counts. Real medical review and regulatory authorization remain human operational responsibilities.
