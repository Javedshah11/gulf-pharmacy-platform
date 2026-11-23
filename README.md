# Gulf Pharmacy — Bilingual public website and staff administration

Bilingual platform for Gulf Pharmacy (صيدلية الخليج), starting with the confirmed Ar Rabi branch in Dammam. Phases 1–3 provide the foundation, secure staff administration, and a server-rendered multi-branch public website with local SEO. Unknown services and opening hours remain empty; no products, reviews, promotions, or additional live branches are invented. Phase 4 has not started.

Stack: Node.js 24 LTS, pnpm workspaces, Next.js App Router, React, strict TypeScript, Tailwind CSS, NestJS REST API, PostgreSQL 17, Drizzle migrations, Redis 7, Docker Compose, ESLint, and Prettier. Fonts are bundled locally for English and Arabic.

## Quick start (PowerShell)

Start Docker Desktop, then run from this repository:

```powershell
pnpm install
if (!(Test-Path infra/.env)) { Copy-Item infra/.env.example infra/.env }
if (!(Test-Path apps/api/.env)) { Copy-Item apps/api/.env.example apps/api/.env }
if (!(Test-Path apps/web/.env)) { Copy-Item apps/web/.env.example apps/web/.env }
if (!(Test-Path packages/database/.env)) { Copy-Item packages/database/.env.example packages/database/.env }
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Copy templates only on first setup; preserve existing `.env` customizations. See [Windows setup](docs/SETUP.md) for configuration and troubleshooting.

English site: http://localhost:3000/en. Arabic: http://localhost:3000/ar. Directory: `/en/branches` and `/ar/branches`; the confirmed profile is `/en/branches/gulf-pharmacy-dammam` with its Arabic counterpart. Both locales include about, contact, privacy, and website-information pages. `/` redirects to `/en`.

API: http://localhost:4000/api. Liveness: http://localhost:4000/api/health. Dependency readiness: http://localhost:4000/api/health/dependencies. Published branches: http://localhost:4000/api/branches, optionally filtered with `?q=Dammam`.

Set the real HTTPS `SITE_ORIGIN` in the web environment before publication. Without it, local pages are noindex, canonical/hreflang URLs are omitted, and the sitemap stays empty. See [local SEO](docs/LOCAL_SEO.md). Super Admins manage publication, verified hours, and approved services in the existing editor; Branch Admins edit permitted profiles only for assigned branches. See [branch management](docs/BRANCH_MANAGEMENT.md).

Staff sign-in: http://localhost:3000/admin/login. Dashboard, branches, staff access, and account settings use the existing Next.js application. Staff accounts require CLI bootstrap and Super Admin assignment; there are no default credentials or public registration. Existing local database configuration remains on **55432**, while fresh-checkout templates recommend 5433. Do not overwrite existing environment files.

After migrations, run `pnpm auth:bootstrap` in an interactive PowerShell terminal to create your first Super Admin with hidden password entry. See [authentication and permissions](docs/AUTHENTICATION.md) for the security model, endpoint list, and instructions for creating a Branch Admin assigned to Dammam.

| Root command                        | Purpose                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| `pnpm dev`                          | Run both applications, building internal packages first                                          |
| `pnpm dev:web` / `pnpm dev:api`     | Run one application                                                                              |
| `pnpm build`                        | Build all packages and apps in dependency order                                                  |
| `pnpm lint`                         | ESLint across source and tests                                                                   |
| `pnpm typecheck`                    | Strict TypeScript checks and Next route types                                                    |
| `pnpm test`                         | Phase 1 tests and real PostgreSQL/Redis security tests in disposable databases                   |
| `pnpm test:browser`                 | Build and run Chrome public/admin/SEO workflows; start missing development servers automatically |
| `pnpm auth:bootstrap`               | Interactively create the initial Super Admin; no-op if one exists                                |
| `pnpm format` / `pnpm format:check` | Format / verify formatting                                                                       |
| `pnpm db:up` / `pnpm db:down`       | Start / stop infrastructure, retaining volumes                                                   |
| `pnpm db:generate`                  | Generate a versioned migration after schema changes                                              |
| `pnpm db:migrate`                   | Apply checked-in migrations                                                                      |
| `pnpm db:seed`                      | Insert the confirmed branch if missing; preserve admin edits                                     |

See [architecture](docs/ARCHITECTURE.md), [complete source tree and folder guide](docs/FOLDER_STRUCTURE.md), [installed dependencies](docs/DEPENDENCIES.md), [testing](docs/TESTING.md), [phases](docs/DEVELOPMENT_PHASES.md), [Phase 1 history](docs/VALIDATION.md), [Phase 2 validation](docs/PHASE_2_VALIDATION.md), and [Phase 3 validation](docs/PHASE_3_VALIDATION.md).

## Gulf Health Academy (Phase 4)

Bilingual reviewed video library at /en/health-academy and /ar/health-academy; staff workspace at /admin/videos. Secure private uploads, dedicated FFmpeg/BullMQ worker, assigned independent medical review, separate compliance authorization, controlled playback and aggregate signals. No live videos are seeded.

Preserve existing .env files and PostgreSQL port 55432. After pnpm install, run pnpm db:up, pnpm db:migrate, pnpm db:seed and pnpm dev (web/API/worker). FFmpeg and FFprobe must be on PATH. For separate worker execution use pnpm dev:worker; compiled execution uses pnpm start:worker. See [PowerShell startup](docs/SETUP.md), [Academy API/architecture](docs/HEALTH_ACADEMY.md) and [validation](docs/PHASE_4_VALIDATION.md).
