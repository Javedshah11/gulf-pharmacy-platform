# Local SEO and language routes

The public website uses server-rendered `/en` and `/ar` pages. Branch profiles, page titles, descriptions, HTML language/direction, canonical links, alternate-language links, and Pharmacy structured data are generated on the server. JavaScript is used for navigation enhancement and retry interactions, not to translate SEO content after loading. `/` redirects to `/en`; the language switch preserves the current public route. Invalid locales and unknown/unpublished branch slugs return 404.

## Origin configuration

Add the **actual owner-controlled HTTPS origin** to `apps/web/.env` as `SITE_ORIGIN` before publication. No domain has been invented or configured for this checkout. Keep it blank during ordinary local development:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:4000
API_INTERNAL_URL=http://localhost:4000
SITE_ORIGIN=
```

`API_INTERNAL_URL` is server-only and can differ from the browser-facing API origin after deployment. It defaults to NEXT_PUBLIC_API_URL and then the local API. Never put database credentials in either URL.

SITE_ORIGIN accepts a public HTTPS origin only, without a path, credentials, query, or fragment. Localhost, local hostnames, and IP addresses are rejected. If the origin is absent, public metadata uses noindex, canonical/hreflang URLs are omitted, robots disallows crawling, and the sitemap is empty. This keeps a local build from silently advertising localhost as a production canonical. Configure the real origin, rebuild, and verify deployment responses before inviting indexing. The test suite uses a reserved `.test` origin in an isolated process only; it is never written to the site's environment files.

## Metadata and crawl controls

Each localized page has a translated title and description. Branch titles/descriptions incorporate that branch's verified name/address/contact details. Published branch pages use self-canonical URLs and matching English/Arabic hreflang plus x-default English. Search-filtered directory URLs canonicalize to the directory and use noindex. Open Graph and Twitter metadata share the title, description, and generated 1200×630 PNG at `/share-image` when the origin is configured.

`/sitemap.xml` is dynamic and queries the same no-store public API as the website. It includes the English/Arabic home, directory, about, contact, privacy, information pages, and only active, published branch profiles. Branch last-modified values come from public_updated_at; no made-up business dates are used. Missing upstream data fails the sitemap request rather than returning cached unpublished profiles.

`/robots.txt` allows the localized public routes only when SITE_ORIGIN is configured and excludes `/admin` and `/api`. Admin metadata remains noindex. NestJS API responses carry `X-Robots-Tag: noindex, nofollow`, including on a separate API origin. Crawl controls supplement access control; protected data still requires backend authorization.

## Business structured data

Branch pages use the [Schema.org Pharmacy type](https://schema.org/Pharmacy), with the verified bilingual name, address, country, phone, postal code when supplied, and the supplied maps URL. OpeningHoursSpecification is included only for explicitly recorded, Super Admin-approved opening periods. There are no inferred coordinates, invented ratings/reviews, email addresses, prices, stock claims, delivery promises, or unverified opening hours. JSON-LD is escaped before insertion into HTML.

Metadata generation follows the [Next.js Metadata API](https://nextjs.org/docs/app/api-reference/functions/generate-metadata). Blocking metadata ensures missing branch pages return an HTTP 404 before page streaming. Branch data uses fetch cache=no-store and dynamic routes; React cache deduplicates reads within a request without persisting profiles between requests. Test both the development and production-mode render after publication changes.

No geographic distance ranking is implemented because verified coordinates were not supplied. Customers can search a real branch name, district, city, or bilingual address and use the branch's existing directions link. This site does not generate location doorway pages or fictional branches.

Before deployment, confirm the real origin and API endpoints, HTTPS/cookie configuration, branch content, ownership approval of privacy/information wording, and crawl behavior at the actual public URL. Search-engine indexing, search ranking, and third-party map/WhatsApp availability are not guaranteed by local tests.
