# Windows 11 setup

Install Node.js 24 LTS (24.15 or newer), Git, pnpm 11.22.0, and Docker Desktop with WSL 2/Linux containers. Use VS Code and PowerShell. Open Docker Desktop and wait until its engine is running. This project uses Node's stable support for loading NestJS 12 ESM packages from compiled CommonJS.

```powershell
node --version
pnpm --version
git --version
docker --version
docker compose version
docker info
Set-Location C:\Users\pc\gulf-pharmacy-platform
pnpm install
```

If pnpm is missing, install the pinned version with `npm install --global pnpm@11.22.0`.

## Environment files

For a fresh checkout only:

```powershell
Copy-Item infra/.env.example infra/.env
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env
Copy-Item packages/database/.env.example packages/database/.env
```

`infra/.env` configures Compose's PostgreSQL user/password/database and published ports. `apps/api/.env` supplies DATABASE_URL, REDIS_URL, PORT, HOST, and CORS_ORIGIN. `packages/database/.env` supplies DATABASE_URL for the Drizzle CLI and scripts. `apps/web/.env` supplies NEXT_PUBLIC_API_URL, which is deliberately public and is embedded into browser bundles at build time. No root `.env` is required. pnpm runs each workspace command from its package folder; dotenv loads server configuration there, while Next.js loads its own environment.

Template credentials are public development examples, not production secrets. If credentials or ports change, update the infrastructure file and both database URLs together. Do not commit local `.env` files.

## Start and verify

```powershell
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Or run `pnpm dev:web` and `pnpm dev:api` in separate terminals. API development uses the TypeScript compiler in watch mode so NestJS dependency injection receives decorator metadata. Internal package builds run automatically before dev. Ctrl+C stops applications. To stop containers without deleting data, run `pnpm db:down`.

```powershell
Invoke-RestMethod http://localhost:4000/api/health
Invoke-RestMethod http://localhost:4000/api/health/dependencies
Invoke-RestMethod http://localhost:4000/api/branches
Invoke-RestMethod http://localhost:4000/api/branches/gulf-pharmacy-dammam
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
```

Open http://localhost:3000. Verify Arabic switching, phone/WhatsApp links, and Google Maps. For a production-mode local preview after building, run `pnpm --filter @gulf/web start`; start the compiled API from its workspace with `pnpm --filter @gulf/api exec node dist/main.js`.

## Staff administration (Phase 2)

Preserve this checkout's existing `.env` files and PostgreSQL port **55432**. The API template adds optional NODE_ENV=development and SESSION_HOURS=8; defaults keep the existing local configuration compatible. Do not replace current files with example values on an established checkout.

```powershell
pnpm install
pnpm db:up
pnpm db:migrate
pnpm auth:bootstrap
pnpm dev
```

Bootstrap asks for your chosen username/name and a hidden password twice in the interactive terminal. It does not accept a password argument and makes no changes if a Super Admin exists. Open http://localhost:3000/admin/login. Use Staff & access to create a Branch Admin and select the confirmed Gulf Pharmacy Dammam branch. See [authentication instructions](AUTHENTICATION.md).

For security tests, `pnpm test` now provisions uniquely named disposable databases using the local PostgreSQL user. For real Chrome checks, keep the frontend running and run `pnpm test:browser` in another terminal. See [testing](TESTING.md) and [Phase 2 validation](PHASE_2_VALIDATION.md).

## Troubleshooting

- Docker pipe/daemon unavailable: start Docker Desktop, select Linux containers, and retry `docker info`.
- Port 5433 in use: preserve the other service. Set POSTGRES_PORT to an unused port such as 5434 in `infra/.env`, update DATABASE_URL in the API and database `.env` files, then rerun `pnpm db:up`. This checkout uses 55432 because both 5433 and 5434 were occupied.
- Port 6381 in use: similarly change REDIS_PORT and the API REDIS_URL. For app port changes, update the corresponding API URL or CORS origin, then restart/rebuild.
- Authentication failure after changing Compose credentials: existing volumes retain their original database users. Restore matching credentials or deliberately migrate the local database; changing `.env` alone does not change an existing database password. `db:down` never removes volumes.
- Branch endpoint unavailable: check dependency readiness, run migrations and seed, and inspect `docker compose --env-file infra/.env -f infra/docker-compose.yml logs`. Logs may contain local configuration; avoid sharing secrets.
- Frontend error card: confirm API port 4000 is running and NEXT_PUBLIC_API_URL/CORS_ORIGIN match the browser origin. Restart Next.js after environment changes.
- Missing workspace output: run `pnpm build`, or build shared/database packages explicitly after editing them.
- Dependency installation slow: allow the single pnpm install process to finish; avoid concurrent installs. Retry the install if registry downloads fail.

After schema edits, run `pnpm db:generate`, inspect SQL and metadata, then `pnpm db:migrate`. Do not use schema push in place of versioned migrations.

## Phase 3 website and SEO

Preserve all existing .env files and PostgreSQL port 55432. Run pnpm install, pnpm db:up, and pnpm db:migrate from PowerShell. Migration 0002 extends public branch profiles without replacing previous migrations. The insert-only pnpm db:seed remains safe for later administrator edits. Run pnpm dev, then open http://localhost:3000/en or http://localhost:3000/ar.

The web template adds optional API_INTERNAL_URL (server-only upstream; defaults to NEXT_PUBLIC_API_URL) and SITE_ORIGIN (the real production HTTPS origin). Leave SITE_ORIGIN blank locally: the site remains noindex and does not emit localhost canonical URLs. Do not replace current local configuration with template database port 5433. Set the actual origin before deployment, rebuild, and inspect metadata/robots/sitemap. See [local SEO](LOCAL_SEO.md).

Super Admin controls publication, verified hours, and approved services through the existing branch editor. Branch Admin can edit permitted business text for assigned branches. Unknown services/hours remain empty; no extra live branches are created. See [branch management](BRANCH_MANAGEMENT.md). pnpm test:browser builds first, reuses or starts missing local app servers, and runs Chrome plus an isolated production-mode SEO/publication fixture. Docker must already be healthy.

## Phase 4 Academy startup (PowerShell)

Preserve existing environment files, PostgreSQL **55432**, Redis **6381**, and administrator edits. API and worker default to the same private repository .local/media directory. The worker loads its optional apps/worker/.env first, then fills missing settings from the existing apps/api/.env; process environment values take priority. No credentials need to be copied or replaced. Use an absolute MEDIA_STORAGE_ROOT when configuring another location.

```powershell
Set-Location C:\Users\pc\gulf-pharmacy-platform
pnpm install --frozen-lockfile
ffmpeg -version
ffprobe -version
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

pnpm db:up starts PostgreSQL and Redis using the preserved infra/.env. pnpm dev starts web, API and the dedicated worker. If FFmpeg is missing, install it with winget install --id Gyan.FFmpeg --exact --accept-package-agreements --accept-source-agreements and open a new PowerShell terminal. Existing binaries can instead be selected with absolute FFMPEG_PATH and FFPROBE_PATH variables.

To start each application in its own PowerShell terminal:

```powershell
# Terminal 1
pnpm dev:api
# Terminal 2
pnpm dev:web
# Terminal 3
pnpm dev:worker
```

For compiled local execution, first run pnpm build, then in separate terminals run pnpm --filter @gulf/api exec node dist/main.js, pnpm --filter @gulf/web start, and pnpm start:worker. Stop each application with Ctrl+C. pnpm db:down stops local services without removing volumes or private media.

Open http://localhost:3000/en/health-academy, http://localhost:3000/ar/health-academy or http://localhost:3000/admin/videos. Provision actual pharmacists/reviewers through Staff & access, assign branch memberships, and assign an independent reviewer to each video. Existing administrators do not automatically become medical reviewers. See [Academy](HEALTH_ACADEMY.md), [storage configuration](VIDEO_STORAGE.md) and [review rules](MEDICAL_REVIEW.md).
