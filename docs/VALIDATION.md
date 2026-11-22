# Phase 1 validation

This is the historical Phase 1 record. The browser limitation described below was resolved during Phase 2 using Playwright and installed Chrome. Current security and browser results are in [PHASE_2_VALIDATION.md](PHASE_2_VALIDATION.md).

Executed locally on Windows 11 with Node 24.19.0, pnpm 11.22.0, Docker 29.7.2, Compose 5.3.1, and Git 2.55.0.windows.3. Validation ran across November 22–23, 2026, Asia/Karachi.

| Check                    | Observed result                                                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency installation  | Passed; lockfile saved, esbuild lifecycle scripts explicitly allowed                                                                                                      |
| Docker Compose           | PostgreSQL 17 and Redis 7 both healthy                                                                                                                                    |
| Infrastructure isolation | PostgreSQL uses 127.0.0.1:55432 in ignored local configuration; Redis uses 127.0.0.1:6381                                                                                 |
| Migration                | Initial migration generated, reviewed, applied; repeat application succeeded                                                                                              |
| Seed idempotency         | Seed ran twice; SQL `SELECT count(*) FROM branches` returned 1                                                                                                            |
| API startup              | `pnpm dev` starts NestJS on port 4000 and Next.js on port 3000                                                                                                            |
| Liveness                 | Live GET `/api/health` returned 200 and status `ok`                                                                                                                       |
| Readiness                | Live GET `/api/health/dependencies` returned 200, database `up`, Redis `up`                                                                                               |
| Redis outage             | Stopped this project's Redis container; live readiness returned 503 with database `up`, Redis `down`; restarted container                                                 |
| Database outage          | Stopped this project's PostgreSQL container; live readiness returned 503 with database `down`, Redis `up`; branch endpoint returned safe generic 503; restarted container |
| Branch list              | Live GET `/api/branches` returned exactly the confirmed Dammam branch with correct Arabic text and contact URLs                                                           |
| Frontend HTTP            | GET `http://localhost:3000` returned 200                                                                                                                                  |
| Production build         | `pnpm build` passed for all four workspaces                                                                                                                               |
| Lint                     | `pnpm lint` passed after configuring CommonJS test imports                                                                                                                |
| Type checking            | `pnpm typecheck` passed for all workspaces                                                                                                                                |
| API tests                | `pnpm test`: 2 tests passed, covering multiple HTTP assertions and environment validation                                                                                 |

Tests exercise the real NestJS HTTP routing/controller/service stack with isolated database/Redis/repository doubles. They check health, dependency degradation, branch list/detail, unknown and malformed slugs, CORS, response projection, and safe errors. Separate live requests above verify actual infrastructure connectivity.

Browser visual and interaction checks remain **unverified**. The browser access host was unavailable, and native Chrome windows could not be inspected because the automation interface reported them minimized. Frontend build, route response, and API/CORS checks passed; these do not replace checking mobile layout, rendered Arabic direction, hydration, retry interaction, or clicking WhatsApp/Maps links in a browser. The supplied external destinations were preserved; their third-party pages were not opened.

Local PostgreSQL ports 5433 and 5434 were already occupied. Existing services were preserved; only ignored `.env` files were adjusted to port 55432. Fresh-checkout templates still recommend 5433. Package installation reports two deprecated transitive development dependencies from the current Drizzle Kit dependency graph (`@esbuild-kit/core-utils` and `@esbuild-kit/esm-loader`); no deprecated direct dependencies were selected.

At the end of Phase 1, Phase 2 had not started and browser verification was still outstanding. See the current Phase 2 record for the follow-up.

Final checks also passed: pnpm format:check; all-workspace typecheck; lint; and both API tests. After outage testing, live readiness returned database up and Redis up, and branch detail returned HTTP 200. Local environment files were verified ignored by Git. The frontend and backend development services remain running.
