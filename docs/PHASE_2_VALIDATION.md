# Phase 2 validation — November 23, 2026

Executed in the existing Windows checkout using Node 24.19.0, pnpm 11.22.0, NestJS 12.6.0, Next.js 16.4.6, PostgreSQL 17, Redis 7, Playwright 1.65.1, and installed Google Chrome. PostgreSQL remains on **127.0.0.1:55432** and Redis on **127.0.0.1:6381**. No Phase 3 implementation was added.

## Completed checks

| Check                        | Actual result                                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| `pnpm install`               | Passed, including the explicitly allowlisted native Argon2 install                             |
| `pnpm build`                 | Passed for shared, database, API, and web; all requested admin routes compiled                 |
| `pnpm lint`                  | Passed                                                                                         |
| `pnpm typecheck`             | Passed for all four workspaces and the Playwright/tooling TypeScript project                   |
| `pnpm test`                  | **13 tests passed, zero failures**; includes 10 real-database security/bootstrap/seed subtests |
| Migration 0001               | Generated, inspected, applied, and safely reapplied                                            |
| Migration 0000               | Preserved; new schema is additive                                                              |
| Confirmed seed               | Reran successfully; isolated regression verifies it preserves administrator edits              |
| Live API readiness           | HTTP 200; database up and Redis up                                                             |
| Live anonymous admin request | HTTP 401 with a safe response, no-store, and credentialed allowlisted CORS                     |
| Development data             | Exactly one existing branch, zero staff users, and zero sessions after implementation          |

The security suite verifies successful/invalid login, generic credential errors, CSRF rejection, no public registration, hashed token storage, HttpOnly/SameSite flags, production Secure/__Host cookie configuration, role restrictions, parameter validation, Branch A/B isolation, allowed branch editing, rejection of privileged fields/null values, staff creation/disabling, membership replacement and session revocation, password change/rotation, expiry, logout replay denial, Redis IP/account limits, safe audit records, CLI bootstrap idempotence, and seed preservation.

Security and browser authentication tests create and drop uniquely named disposable databases. Test-only accounts and branches never enter the live development pharmacy database. No real staff account or default staff password was created. Repeated bootstrap behavior was executed against an existing Super Admin in an isolated database; entering the first real Super Admin password in an interactive terminal remains a user setup step.

## Browser checks

Real Chrome runs use desktop (1280px), tablet (820px), and mobile (390px) viewports. Admin browser tests use a real isolated NestJS server and PostgreSQL database through network forwarding; login responses are not mocked. Public checks use the actual development API.

**Final `pnpm test:browser` result: 12 passed, zero failures (1.4 minutes).** Four scenarios ran at each of the three viewport sizes. They cover public branch data, Arabic font/RTL, supplied contact link attributes, navigation, lack of horizontal page overflow, recoverable API errors, real login/logout, HttpOnly cookies, no localStorage tokens, staff creation/assignment/disabling, branch-restricted UI, profile editing with confirmation, password changes, and server-side session expiry redirection. Normal anonymous `/auth/me` 401 responses and the deliberate public outage response are expected; they are not JavaScript runtime failures. No unexpected console errors or page exceptions occurred in the happy-path flows. Desktop and mobile screenshots were inspected for visual layout.

Final `pnpm format:check` also passed. Test databases were cleaned up after each run. There are no known blocking local implementation issues. The development frontend/API and healthy infrastructure remain available for the user's own bootstrap and sign-in.

## Failures found and corrected

- The first native Argon2 install was stopped by pnpm's build policy; the specific package was allowlisted and its installation then succeeded.
- TypeScript caught widened Argon2 option types; the options now preserve their literal types.
- An early security test found partial-update DTOs carried undefined fields. Update services now omit undefined values and still reject null/invalid values.
- Chrome reported an invalid username HTML pattern under its current Unicode regexp rules. The pattern was corrected; real admin workflows subsequently completed without unexpected console errors.
- A browser run overlapped a development configuration restart, and an early multi-step test had an insufficient time budget. Final runs occur after configuration settles with a suitable timeout.
- The retry-test alert selector initially also matched Next.js's route announcer. It now targets the branch card's alert specifically.

No production deployment, third-party messaging, or external Google Maps availability check was performed. Contact destinations are preserved and their URL attributes are verified. Production HTTPS cookie behavior was checked at configuration level; an actual production TLS deployment was not part of this local task. The initial hidden-password terminal interaction is documented for the user rather than creating a live account without their chosen credentials.
