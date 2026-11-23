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

You can keep both applications running in one terminal:

```powershell
pnpm dev
```

Then in another terminal, or directly when no apps are running:

```powershell
pnpm test:browser
```

The browser command builds all workspaces first. Playwright reuses healthy local servers or starts missing frontend/API development processes. The production-mode publication/SEO fixture starts an additional temporary instance of the same built frontend against a disposable database, on an automatically selected local port; it is not another application in the repository.

Playwright is installed as a root development dependency and uses the installed Google Chrome (`channel: chrome`). If Chrome is unavailable, install it from its official vendor or configure an installed Playwright Chromium channel; report skipped browser checks accurately. Tests expect the frontend at http://localhost:3000 and its configured API URL at http://localhost:4000. BROWSER_BASE_URL can override the frontend base URL, but the authorization harness currently approves the default local origin.

Public tests check server-rendered English/Arabic routes, correct document language/direction after navigation, desktop/tablet/mobile overflow, real branch data, directory search/empty states, branch profiles, structured data, invalid-route 404s, and supplied contact destinations. External popup navigation is intercepted after verifying the exact destination URL; no messages are sent and no third-party uptime is asserted. Admin tests retain sign-in/out, session expiry, staff creation/access/disabling, branch editing, and password changes. Expected anonymous auth/me 401 messages are excluded from the unexpected-error assertion.

The integration project verifies real production SSR with a reserved test-only HTTPS SEO origin, canonical/hreflang/OG URLs, sitemap publication filtering, generated PNG sharing image, immediate visibility of permitted Branch Admin edits, Super Admin publication controls, and translated error/retry states. Frontend server fetches reach a real isolated NestJS instance. Pure SEO checks reject localhost/unsafe origins and omitted/unverified schema fields. Security tests also prove a single API can return 12 published test branches and that seed reruns preserve edits and publication state.

Test data never enters the live pharmacy database. No real staff credentials are needed or recorded; traces are disabled to avoid recording authentication bodies. Screenshot artifacts contain only public information or explicitly labeled isolated test profiles.

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

## Phase 4 tests

pnpm test includes isolated Academy integration tests using a deterministic two-second synthetic color MP4 generated by the installed FFmpeg. The fixture creates a disposable PostgreSQL database, unique Redis queue, test-only staff, and a media root below .local/tests; cleanup removes its queue, files and database. It validates actual transcoding, authentication, branch isolation, signatures/size/quota, processing failures/retries, independent reviews, regulatory expiry, public byte ranges, originals denied, captions, aggregate events and archiving. API test files run serially to avoid local PostgreSQL fixture provisioning/cleanup contention.

pnpm test:browser builds all workspaces and runs the existing regressions plus tests/browser/academy.spec.ts against an isolated production Next server and real Nest/worker/database. The complete pharmacist-to-publication flow uses real UI actions, then checks en/ar at 1440, 820 and 390 pixels, native playback, metadata, sitemap, private original rejection and archive removal. Browser API routing changes only the test upstream location; server authorization is real. No fixture is published in the development database.
