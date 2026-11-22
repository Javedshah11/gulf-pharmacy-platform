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
