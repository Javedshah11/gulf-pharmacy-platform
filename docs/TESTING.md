# Testing and browser verification

Run from PowerShell in the repository root with Docker infrastructure running:

```powershell
pnpm install
pnpm db:up
pnpm db:migrate
pnpm build
pnpm lint
pnpm typecheck
pnpm format:check
pnpm test
```

`pnpm test` retains the Phase 1 HTTP tests and adds real PostgreSQL/Redis security tests. The harness creates a uniquely named `gulf_pharmacy_test_<pid>_<random>` database, applies all migrations, creates clearly labeled disposable test-only fixtures, and drops only that exact test database afterward. It never inserts test staff or branches into the development pharmacy database. The local PostgreSQL user needs CREATE DATABASE permission; the development Compose user has it. Tests use Redis database 15 with unique expiring limiter keys and never flush Redis.

The security tests cover CSRF rejection, generic invalid-login errors, cookie flags, hashed session storage, unauthenticated access, public endpoints, branch isolation, role escalation attempts, staff creation/disabling, assignment revocation, password rotation, expired/revoked sessions, logout replay, both limiter budgets, audit secrecy, and bootstrap idempotence. Request errors deliberately exercised by the Phase 1 test emit a generic error line; a passing test suite still exits zero.

## Real Chrome checks

Start both applications in one terminal:

```powershell
pnpm dev
```

Then in another terminal:

```powershell
pnpm test:browser
```

Playwright is installed as a root development dependency and uses the installed Google Chrome (`channel: chrome`). If Chrome is unavailable, install it from its official vendor or configure an installed Playwright Chromium channel; report skipped browser checks accurately. Tests expect the frontend at http://localhost:3000 and its configured API URL at http://localhost:4000. BROWSER_BASE_URL can override the frontend base URL, but the authorization harness currently approves the default local origin.

Public tests check the actual development branch API, desktop/tablet/mobile viewport overflow, Arabic font/direction, branch address, navigation, and exact supplied WhatsApp/Maps URL attributes. They do not send messages or assert third-party availability. Admin tests exercise real sign-in/sign-out, server-side sessions, staff creation, membership assignment, disabling accounts, branch editing, password changes, and Arabic layout. Playwright forwards the frontend's API requests to a real isolated NestJS instance backed by a disposable database; authentication responses are not mocked. Expected anonymous `/auth/me` 401 console messages are excluded from the unexpected-error assertion. No real staff credentials are required or recorded. Traces are disabled to avoid recording authentication request bodies. Ignored screenshots contain test-only profiles, not secrets.

Do not edit server configuration or run dependency installs during browser tests: development restarts can interrupt navigation. Run final tests after builds and configuration changes settle. If a run is interrupted before cleanup, inspect leftover databases matching the exact test naming convention before removing them; never remove the pharmacy database.

## Manual fallback / acceptance checklist

If browser automation is unavailable, record the exact failure and complete these checks manually:

1. Open the public homepage at desktop width, tablet width, and approximately 390px mobile width. Confirm branding, the Dammam address, no horizontal page overflow, Arabic rendering/RTL switching, and contact links.
2. Inspect browser Console and Network. Confirm public branch requests succeed without login and no hydration/runtime errors appear.
3. Run `pnpm auth:bootstrap` in an interactive terminal using your own credentials. Confirm hidden password entry and that a second run makes no account changes.
4. Visit `/admin/dashboard` signed out; confirm redirection to login. Sign in and verify overview, branches, staff, and settings routes.
5. Create a real Branch Admin assigned only to Dammam. Sign in in another browser session and confirm the staff navigation is absent and only assigned branch profiles are shown.
6. Check a foreign branch UUID directly through the protected API; confirm 403. Do not invent additional live branches for this check; the automated isolated database test supplies Branch A/B fixtures.
7. Edit permitted profile details with confirmation, then restore any deliberate test change. Check public data updates. Verify staff-access changes and account disabling invalidate existing sessions.
8. Change the password; verify other sessions stop working. Sign out and verify protected routes return to login. Confirm no authentication token is in localStorage, sessionStorage, page URLs, or API JSON.

The manual checklist supplements the automated results in PHASE_2_VALIDATION.md; it is not a claim that those manual checks were performed.
