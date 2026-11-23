# Folder guide

| Folder                        | What belongs here                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| `apps/web/app`                | Next.js routes, root metadata/layout, and global styles                                    |
| `apps/web/components/ui`      | Reusable presentation, such as the brand mark                                              |
| `apps/web/components/layout`  | Header and footer                                                                          |
| `apps/web/features`           | Business UI grouped by feature: homepage and API-backed branch card                        |
| `apps/web/lib/api`            | Browser-safe REST API clients                                                              |
| `apps/web/lib/utils`          | Frontend helpers such as locale direction                                                  |
| `apps/web/types`              | Frontend-only loading-state types                                                          |
| `apps/web/public`             | Static brand assets, currently the SVG icon                                                |
| `apps/api/src/branches`       | Branch controller, service, repository, and module                                         |
| `apps/api/src/health`         | API liveness and dependency readiness                                                      |
| `apps/api/src/config`         | Validated server environment and provider token                                            |
| `apps/api/src/auth`           | Argon2id passwords, session cookies, login/profile/password endpoints, session/role guards |
| `apps/api/src/admin`          | Authorized staff, branch profiles, and membership management                               |
| `apps/api/src/cli`            | Interactive initial Super Admin bootstrap                                                  |
| `apps/web/app/admin`          | Admin routes, responsive styles, and session layouts                                       |
| `apps/web/features/admin`     | Shared session provider, API client, screens, forms, states, and dialogs                   |
| `tests/browser`               | Real Chrome public/admin workflows with isolated authentication test databases             |
| `apps/api/src/infrastructure` | PostgreSQL and Redis lifecycle providers                                                   |
| `apps/api/src/common`         | Safe global error filter                                                                   |
| `apps/api/test`               | HTTP integration tests using dependency doubles                                            |
| `packages/database/src`       | Drizzle schema, connection factory, migration and seed entrypoints                         |
| `packages/database/drizzle`   | Version-controlled SQL migrations and generated metadata                                   |
| `packages/shared/src`         | Common branch types and constants; no server secrets or frameworks                         |
| `infra`                       | Development-only Compose services and environment template                                 |
| `docs`                        | Setup, architecture, phase plan, and validation evidence                                   |

Root configuration owns workspace membership, scripts, strict TypeScript defaults, ESLint, Prettier, and ignores. Every workspace has a package manifest and TypeScript configuration. `pnpm-lock.yaml` locks the resolved dependency graph.

Extend existing branch/admin modules for authorized branch management changes. Authentication lives in the auth module and admin frontend features. Add future video, AI, and marketing capabilities as separate feature modules only when their phases are authorized. Add shared contracts only when multiple applications need them. Do not put server configuration or database imports in the browser package. Generated `dist`, `.next`, test screenshots/reports, dependencies, and local environment files are ignored.

## Phase 3 additions

- apps/web/app/[locale]: server-rendered English/Arabic pages and public styles. Existing admin routes stay in app/admin.
- apps/web/features/localization: typed dictionaries, URL locale validation, and document attribute synchronization.
- apps/web/features/contact: reusable calling/WhatsApp/maps actions, sticky mobile actions, and contact page.
- apps/web/features/branches: public directory, profile, cards, and translated errors.
- apps/web/features/admin/public-profile-fields.tsx: added fields inside the existing editor, with Super Admin publication/hour/service controls.
- apps/web/lib/api/public-branches.ts: server-only anonymous, no-store public reads; existing staff clients stay separate.
- apps/web/lib/seo: origin validation, metadata, structured data, and sitemap generation helpers.
- apps/web/proxy.ts: derives SSR document locale from the URL.
- apps/web/app/sitemap.ts, robots.ts, share-image/route.tsx: crawl/sharing responses.
- packages/database/drizzle/0002_public_branch_profiles.sql: additive public business fields.
- tests/browser/support: isolated production-mode frontend fixture.

## Created source tree

Actual source files for Phases 1 through 3 are shown below. Generated outputs, dependencies, ignored test screenshots, and local environment files are omitted. Existing .env files stay in infra, apps/api, apps/web, and packages/database.

```text
gulf-pharmacy-platform/
|-- apps
|   |-- api
|   |   |-- src
|   |   |   |-- admin
|   |   |   |   |-- admin.controller.ts
|   |   |   |   |-- admin.dto.ts
|   |   |   |   |-- admin.module.ts
|   |   |   |   `-- admin.service.ts
|   |   |   |-- auth
|   |   |   |   |-- auth.controller.ts
|   |   |   |   |-- auth.dto.ts
|   |   |   |   |-- auth.guards.ts
|   |   |   |   |-- auth.module.ts
|   |   |   |   |-- auth.service.ts
|   |   |   |   |-- auth.types.ts
|   |   |   |   |-- password.ts
|   |   |   |   `-- session-cookie.ts
|   |   |   |-- branches
|   |   |   |   |-- branches.controller.ts
|   |   |   |   |-- branches.module.ts
|   |   |   |   |-- branches.repository.ts
|   |   |   |   `-- branches.service.ts
|   |   |   |-- cli
|   |   |   |   `-- bootstrap.ts
|   |   |   |-- common
|   |   |   |   `-- api-exception.filter.ts
|   |   |   |-- config
|   |   |   |   `-- environment.ts
|   |   |   |-- health
|   |   |   |   |-- health.controller.ts
|   |   |   |   |-- health.module.ts
|   |   |   |   `-- health.service.ts
|   |   |   |-- infrastructure
|   |   |   |   |-- database.service.ts
|   |   |   |   |-- infrastructure.module.ts
|   |   |   |   `-- redis.service.ts
|   |   |   |-- app.module.ts
|   |   |   |-- configure-app.ts
|   |   |   `-- main.ts
|   |   |-- test
|   |   |   |-- support
|   |   |   |   `-- harness.cjs
|   |   |   |-- api.test.cjs
|   |   |   |-- auth.test.cjs
|   |   |   `-- publication.test.cjs
|   |   |-- .env.example
|   |   |-- package.json
|   |   `-- tsconfig.json
|   `-- web
|       |-- app
|       |   |-- [locale]
|       |   |   |-- about
|       |   |   |   `-- page.tsx
|       |   |   |-- branches
|       |   |   |   |-- [slug]
|       |   |   |   |   `-- page.tsx
|       |   |   |   `-- page.tsx
|       |   |   |-- contact
|       |   |   |   `-- page.tsx
|       |   |   |-- privacy
|       |   |   |   `-- page.tsx
|       |   |   |-- terms
|       |   |   |   `-- page.tsx
|       |   |   |-- error.tsx
|       |   |   |-- layout.tsx
|       |   |   |-- page.tsx
|       |   |   `-- public.css
|       |   |-- admin
|       |   |   |-- (protected)
|       |   |   |   |-- branches
|       |   |   |   |   |-- [id]
|       |   |   |   |   |   `-- page.tsx
|       |   |   |   |   `-- page.tsx
|       |   |   |   |-- dashboard
|       |   |   |   |   `-- page.tsx
|       |   |   |   |-- settings
|       |   |   |   |   `-- page.tsx
|       |   |   |   |-- staff
|       |   |   |   |   `-- page.tsx
|       |   |   |   `-- layout.tsx
|       |   |   |-- login
|       |   |   |   `-- page.tsx
|       |   |   |-- admin.css
|       |   |   |-- layout.tsx
|       |   |   `-- page.tsx
|       |   |-- share-image
|       |   |   `-- route.tsx
|       |   |-- globals.css
|       |   |-- layout.tsx
|       |   |-- not-found.tsx
|       |   |-- page.tsx
|       |   |-- robots.ts
|       |   `-- sitemap.ts
|       |-- components
|       |   |-- layout
|       |   |   |-- footer.tsx
|       |   |   `-- header.tsx
|       |   `-- ui
|       |       |-- brand.tsx
|       |       `-- public-icons.tsx
|       |-- features
|       |   |-- admin
|       |   |   |-- api.ts
|       |   |   |-- branches.tsx
|       |   |   |-- login.tsx
|       |   |   |-- provider.tsx
|       |   |   |-- public-profile-fields.tsx
|       |   |   |-- settings.tsx
|       |   |   |-- shell.tsx
|       |   |   |-- staff.tsx
|       |   |   |-- ui.tsx
|       |   |   `-- use-resource.ts
|       |   |-- branches
|       |   |   |-- branch-card.tsx
|       |   |   |-- branch-profile.tsx
|       |   |   |-- directory.tsx
|       |   |   `-- public-state.tsx
|       |   |-- contact
|       |   |   |-- contact-actions.tsx
|       |   |   `-- contact-page.tsx
|       |   |-- home
|       |   |   |-- home.tsx
|       |   |   `-- information-page.tsx
|       |   `-- localization
|       |       |-- dictionaries.ts
|       |       |-- document-locale.tsx
|       |       `-- locale.ts
|       |-- lib
|       |   |-- api
|       |   |   |-- branches.ts
|       |   |   `-- public-branches.ts
|       |   |-- seo
|       |   |   `-- site.ts
|       |   `-- utils
|       |       `-- locale.ts
|       |-- public
|       |   `-- icon.svg
|       |-- types
|       |   `-- api.ts
|       |-- .env.example
|       |-- AGENTS.md
|       |-- next-env.d.ts
|       |-- next.config.ts
|       |-- package.json
|       |-- postcss.config.mjs
|       |-- proxy.ts
|       `-- tsconfig.json
|-- docs
|   |-- ARCHITECTURE.md
|   |-- AUTHENTICATION.md
|   |-- BRANCH_MANAGEMENT.md
|   |-- DEPENDENCIES.md
|   |-- DEVELOPMENT_PHASES.md
|   |-- FOLDER_STRUCTURE.md
|   |-- LOCAL_SEO.md
|   |-- PHASE_2_VALIDATION.md
|   |-- PHASE_3_VALIDATION.md
|   |-- SETUP.md
|   |-- TESTING.md
|   `-- VALIDATION.md
|-- infra
|   |-- .env.example
|   `-- docker-compose.yml
|-- packages
|   |-- database
|   |   |-- drizzle
|   |   |   |-- meta
|   |   |   |   |-- _journal.json
|   |   |   |   |-- 0000_snapshot.json
|   |   |   |   |-- 0001_snapshot.json
|   |   |   |   `-- 0002_snapshot.json
|   |   |   |-- 0000_create_branches.sql
|   |   |   |-- 0001_staff_authentication.sql
|   |   |   `-- 0002_public_branch_profiles.sql
|   |   |-- src
|   |   |   |-- environment.ts
|   |   |   |-- index.ts
|   |   |   |-- migrate.ts
|   |   |   |-- schema.ts
|   |   |   `-- seed.ts
|   |   |-- .env.example
|   |   |-- drizzle.config.ts
|   |   |-- package.json
|   |   `-- tsconfig.json
|   `-- shared
|       |-- src
|       |   `-- index.ts
|       |-- package.json
|       `-- tsconfig.json
|-- tests
|   `-- browser
|       |-- support
|       |   `-- production.cjs
|       |-- admin.spec.ts
|       |-- public.spec.ts
|       |-- publication.spec.ts
|       `-- seo.spec.ts
|-- .gitignore
|-- .prettierignore
|-- .prettierrc.json
|-- eslint.config.mjs
|-- package.json
|-- playwright.config.ts
|-- pnpm-lock.yaml
|-- pnpm-workspace.yaml
|-- README.md
|-- tsconfig.base.json
`-- tsconfig.tools.json
```

## Phase 4 additions

apps/worker is the dedicated media process. packages/media contains storage, configuration and processing. apps/api/src/videos owns Academy contracts/controllers/service. Public UI lives in apps/web/features/health-academy and app/[locale]/health-academy; staff UI in features/video-management and app/admin/(protected)/videos. packages/database/src/health-schema.ts and migration 0003 add Academy data without replacing the existing schema. See [detailed tree](HEALTH_ACADEMY.md).
