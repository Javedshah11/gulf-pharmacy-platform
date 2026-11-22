# Installed dependencies

Exact dependency resolutions are committed in `pnpm-lock.yaml`. `pnpm list -r --depth 0` prints the current direct graph.

Phase 2 additions: **argon2 0.45.2** (API runtime), **@types/express 5.0.6** (API development), and **@playwright/test 1.65.1** (root development/browser automation). Existing framework versions remain Next.js 16.4.6 and NestJS 12.6.0. Native Argon2 installation is explicitly approved through the pnpm build allowlist. No second frontend or backend application was added.

| Workspace        | Direct dependencies installed                                                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Root tooling     | TypeScript 5.9.3, ESLint 10.15.0, @eslint/js 10.0.1, typescript-eslint 8.73.0, eslint-config-prettier 10.1.8, Prettier 3.10.1, @types/node 24.19.2                                                           |
| Web runtime      | Next.js 16.4.6, React / React DOM 19.3.1, Inter / Noto Sans Arabic variable Fontsource packages 5.3.0, @gulf/shared                                                                                          |
| Web tooling      | Tailwind CSS / @tailwindcss/postcss 4.3.5, @types/react / @types/react-dom 19.3.0                                                                                                                            |
| API runtime      | @nestjs/common / core / platform-express 12.6.0, class-transformer 0.5.1, class-validator 0.14.4, dotenv 17.4.2, ioredis 5.11.1, reflect-metadata 0.2.2, RxJS 7.8.2, Zod 4.6.7, @gulf/database, @gulf/shared |
| API tooling      | @nestjs/testing 12.6.0, Supertest 7.3.2, @types/supertest 6.0.3, tsc-watch 7.2.1                                                                                                                             |
| Database runtime | Drizzle ORM 0.45.4, pg 8.23.1, dotenv 17.4.2                                                                                                                                                                 |
| Database tooling | Drizzle Kit 0.31.11, tsx 4.23.15, @types/pg 8.23.1                                                                                                                                                           |
| Shared           | No runtime dependencies                                                                                                                                                                                      |

Node 24.19 meets the installed framework runtime requirements. See the official [Next.js installation requirements](https://nextjs.org/docs/app/getting-started/installation) and [NestJS version requirements](https://docs.nestjs.com/migration-guide). TypeScript 5.9 compiles this hand-configured project; Nest CLI/schematics are not installed or needed.
