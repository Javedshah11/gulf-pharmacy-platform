# Gulf Pharmacy — Foundation and staff administration

Bilingual platform for Gulf Pharmacy (صيدلية الخليج), starting with the confirmed Ar Rabi branch in Dammam. Phase 2 adds secure staff sessions, role-based administration, and branch membership controls. No products, opening hours, reviews, promotions, or additional live branches are invented. Phase 3 has not started.

Stack: Node.js 24 LTS, pnpm workspaces, Next.js App Router, React, strict TypeScript, Tailwind CSS, NestJS REST API, PostgreSQL 17, Drizzle migrations, Redis 7, Docker Compose, ESLint, and Prettier. Fonts are bundled locally for English and Arabic.

## Quick start (PowerShell)

Start Docker Desktop, then run from this repository:

```powershell
pnpm install
Copy-Item infra/.env.example infra/.env
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env
Copy-Item packages/database/.env.example packages/database/.env
pnpm db:up
```

### Database Initialization

```powershell
pnpm db:migrate
pnpm db:seed
```

### Start Development

```powershell
pnpm dev
```

Copy templates only on first setup; preserve existing `.env` customizations. See [Windows setup](docs/SETUP.md) for configuration and troubleshooting.

Frontend: http://localhost:3000. API: http://localhost:4000/api. Liveness: http://localhost:4000/api/health. Dependency readiness: http://localhost:4000/api/health/dependencies. Branches: http://localhost:4000/api/branches.

Staff sign-in: http://localhost:3000/admin/login. Dashboard, branches, staff access, and account settings use the existing Next.js application. Staff accounts require CLI bootstrap and Super Admin assignment; there are no default credentials or public registration. Existing local database configuration remains on **55432**, while fresh-checkout templates recommend 5433. Do not overwrite existing environment files.

After migrations, run `pnpm auth:bootstrap` in an interactive PowerShell terminal to create your first Super Admin with hidden password entry. See [authentication and permissions](docs/AUTHENTICATION.md) for the security model, endpoint list, and instructions for creating a Branch Admin assigned to Dammam.

| Root command                        | Purpose                                                                                            |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| `pnpm dev`                          | Run both applications, building internal packages first                                            |
| `pnpm dev:web` / `pnpm dev:api`     | Run one application                                                                                |
| `pnpm build`                        | Build all packages and apps in dependency order                                                    |
| `pnpm lint`                         | ESLint across source and tests                                                                     |
| `pnpm typecheck`                    | Strict TypeScript checks and Next route types                                                      |
| `pnpm test`                         | Phase 1 tests and real PostgreSQL/Redis security tests in disposable databases                     |
| `pnpm test:browser`                 | Real Chrome public/admin workflows at desktop, tablet, and mobile sizes; requires running frontend |
| `pnpm auth:bootstrap`               | Interactively create the initial Super Admin; no-op if one exists                                  |
| `pnpm format` / `pnpm format:check` | Format / verify formatting                                                                         |
| `pnpm db:up` / `pnpm db:down`       | Start / stop infrastructure, retaining volumes                                                     |
| `pnpm db:generate`                  | Generate a versioned migration after schema changes                                                |
| `pnpm db:migrate`                   | Apply checked-in migrations                                                                        |
| `pnpm db:seed`                      | Insert the confirmed branch if missing; preserve admin edits                                       |

See [architecture](docs/ARCHITECTURE.md), [complete source tree and folder guide](docs/FOLDER_STRUCTURE.md), [installed dependencies](docs/DEPENDENCIES.md), [testing procedure](docs/TESTING.md), [phases](docs/DEVELOPMENT_PHASES.md), [Phase 1 history](docs/VALIDATION.md), and [Phase 2 validation](docs/PHASE_2_VALIDATION.md).
