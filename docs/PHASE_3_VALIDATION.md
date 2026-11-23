# Phase 3 validation — November 23, 2026

Phase 3 was implemented in the existing checkout and resumed from its partial state. It retains one Next.js frontend, one NestJS API, the PostgreSQL database on local port **55432**, Redis on **6381**, and all Phase 2 session and staff-management controls. No Phase 4 implementation was added.

## Implemented routes and data

English/Arabic home, branch directory, branch profile, about, contact, privacy, and website-information pages are server-rendered under `/en` and `/ar`. `/` redirects to `/en`; invalid locales and missing/unpublished branch slugs return 404. Shared dictionaries translate navigation/forms/states, and document attributes are correct for direct loads and client navigation.

Public GET `/api/branches` and `/api/branches/:slug` now require active and published state. Search uses optional `q`, supports bilingual names/addresses, and escapes SQL LIKE wildcards. Public responses project business fields only. Existing protected administration endpoints enforce the added field permissions with the same session, role, membership, CSRF, and audit mechanisms.

Migration `0002_public_branch_profiles.sql` adds publication, bilingual descriptions/contact names, postal code, structured hours/services, a public update timestamp, a publication index, and JSON-array constraints. Applied migrations 0000/0001 were not modified. Only the existing confirmed Dammam branch was published; its original ID, name, address, phone, links, and activation state were retained. New contact fields use the supplied Dr. Fahad Badshah details and postal code 32241. Unknown hours/services remain empty and are omitted from structured data. No extra live pharmacy or test account was inserted.

## Executed checks

| Check                         | Result                                                                                                                                                                                 |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency installation       | Passed; no new external dependency was needed                                                                                                                                          |
| Migration                     | Generated, inspected, applied; previous migration contents retained                                                                                                                    |
| Monorepo production build     | Passed, including all localized routes and protected admin routes                                                                                                                      |
| Lint                          | Passed                                                                                                                                                                                 |
| Type checking                 | Passed for all workspaces and browser/tooling code                                                                                                                                     |
| API regression/security suite | **18 tests passed, zero failures**                                                                                                                                                     |
| Twelve-branch capability      | A disposable database returned 12 published test branches through the same endpoint                                                                                                    |
| Publication and permissions   | Tested draft/inactive exclusion, assigned-branch editing, foreign-branch denials, Super Admin-only publication/hours/services, and transactional audits                                |
| Seed preservation             | Repeated seed preserved administrator edits and an unpublished state in an isolated database                                                                                           |
| Production SEO fixture        | Passed canonical/hreflang/OG configuration, published-only sitemap, live edit visibility, unpublish/republish 404 behavior, generated PNG sharing response, and UI publication control |
| Error/retry                   | An isolated API failure produced an Arabic error state; retry restored the published branch data                                                                                       |

**Final complete `pnpm test:browser`: 18 passed, zero failures, zero skips (2.1 minutes).** `pnpm format:check` also passed. Browser scenarios cover desktop, tablet, and mobile public/admin workflows; direct SSR language/direction; route-preserving language switching; real directory data/search/no-results; Dammam details; contact URLs and formatted telephone links; structured data; 404/private indexing behavior; staff operations; password/session flows; responsive publication editor; and production-mode publication/SEO.

Final `pnpm install --frozen-lockfile` and repeat migration application passed. `git diff --check` found no whitespace errors. The development Dammam record remains ID `6a06a427-92d9-45e3-8e1c-a547d4b342b2`, published, with zero invented hours/services. Public screenshots are saved under ignored `.local/phase3-*.png`; automated desktop/tablet/mobile screenshots and publication-editor captures are in ignored `test-results/`. Those captures are local review artifacts, not fictitious pharmacy assets.

Browser requests to WhatsApp and Maps verify popup navigation reaches the exact supplied destination, then intercept external transport. No message is sent and third-party uptime is not asserted. Real production-mode SSR is exercised against an isolated NestJS/database instance using a reserved test-only HTTPS SEO origin, never an invented production domain. No real staff credentials are required or recorded. Temporary databases and frontend processes are cleaned up after testing.

## Issues found and corrected

- Next retains root layouts during client navigation: direct Arabic SSR was correct, but a language switch originally retained English html attributes. Public URL content/metadata remains server-rendered; a small document-locale synchronizer now updates retained root attributes after navigation.
- A raw-HTML assertion incorrectly assumed lowercase hrefLang serialization. HTML attribute names are case-insensitive, and the assertion now checks accordingly; DOM metadata checks remain strict about values.
- The production fixture initially reused one cookie jar for two identities. Login correctly rotated/revoked the presented prior session. Separate test clients now model separate staff browsers; production session handling was not weakened or changed.
- Lint findings in new test support code were corrected. No known application failure is being deferred as documentation-only work.

## Deployment requirements and verification limits

Set the actual owner-controlled HTTPS SITE_ORIGIN and browser/server API origins before publication, rebuild, and verify them at the real public URL. Local unconfigured pages deliberately use noindex, omit production canonical/hreflang URLs, and expose an empty sitemap. Confirm production HTTPS, cookie/proxy settings, secrets, backups, operational monitoring, and ownership review of public/privacy/information copy. No deployment or search-engine indexing submission was performed.

Only one real branch is currently confirmed. Additional real branch records require verified business data and publication approval; no branch-creation UI, geolocation/distance ranking, unverified services/hours, stock, promotions, ratings, or email addresses were fabricated. Phase 4 remains unstarted.

Production-mode public screenshots were saved against the real Dammam API record and visually reviewed (English directory and Arabic mobile homepage). No development overlays or test pharmacy data are used in these four public screenshots.

## Actual current-checkout file inventory

M marks modified tracked files and ?? marks newly created files. This checkout already retained the earlier Phase 3 migration/scaffolding at the resume point; migration 0002 remains part of the completed logical Phase 3 implementation even when it is absent from this working diff. Ignored build and screenshot artifacts are omitted.

```text
 M README.md
 M apps/api/package.json
 M apps/api/src/admin/admin.dto.ts
 M apps/api/src/admin/admin.service.ts
 M apps/api/src/branches/branches.controller.ts
 M apps/api/src/branches/branches.repository.ts
 M apps/api/src/branches/branches.service.ts
 M apps/api/src/configure-app.ts
 M apps/api/test/auth.test.cjs
 M apps/api/test/support/harness.cjs
 M apps/web/app/[locale]/layout.tsx
 M apps/web/app/[locale]/page.tsx
 M apps/web/app/admin/admin.css
 M apps/web/app/layout.tsx
 M apps/web/app/page.tsx
 M apps/web/app/robots.ts
 M apps/web/app/share-image/route.tsx
 M apps/web/app/sitemap.ts
 M apps/web/components/layout/footer.tsx
 M apps/web/components/layout/header.tsx
 M apps/web/components/ui/public-icons.tsx
 M apps/web/features/admin/branches.tsx
 M apps/web/features/branches/branch-card.tsx
 M apps/web/features/branches/public-state.tsx
 M apps/web/features/contact/contact-actions.tsx
 M apps/web/features/home/home.tsx
 M apps/web/features/localization/dictionaries.ts
 M apps/web/features/localization/locale.ts
 M apps/web/lib/api/public-branches.ts
 M apps/web/lib/seo/site.ts
 M apps/web/next-env.d.ts
 M apps/web/proxy.ts
 M docs/ARCHITECTURE.md
 M docs/AUTHENTICATION.md
 M docs/DEPENDENCIES.md
 M docs/DEVELOPMENT_PHASES.md
 M docs/FOLDER_STRUCTURE.md
 M docs/SETUP.md
 M docs/TESTING.md
 M package.json
 M packages/database/drizzle/meta/0002_snapshot.json
 M packages/database/src/index.ts
 M packages/database/src/schema.ts
 M packages/shared/src/index.ts
 M playwright.config.ts
 M tests/browser/admin.spec.ts
 M tests/browser/public.spec.ts
 M tsconfig.tools.json
?? apps/api/test/publication.test.cjs
?? apps/web/app/[locale]/about/page.tsx
?? apps/web/app/[locale]/branches/[slug]/page.tsx
?? apps/web/app/[locale]/branches/page.tsx
?? apps/web/app/[locale]/contact/page.tsx
?? apps/web/app/[locale]/error.tsx
?? apps/web/app/[locale]/privacy/page.tsx
?? apps/web/app/[locale]/public.css
?? apps/web/app/[locale]/terms/page.tsx
?? apps/web/app/not-found.tsx
?? apps/web/features/admin/public-profile-fields.tsx
?? apps/web/features/branches/branch-profile.tsx
?? apps/web/features/branches/directory.tsx
?? apps/web/features/contact/contact-page.tsx
?? apps/web/features/home/information-page.tsx
?? apps/web/features/localization/document-locale.tsx
?? docs/BRANCH_MANAGEMENT.md
?? docs/LOCAL_SEO.md
?? docs/PHASE_3_VALIDATION.md
?? tests/browser/publication.spec.ts
?? tests/browser/seo.spec.ts
?? tests/browser/support/production.cjs
```
