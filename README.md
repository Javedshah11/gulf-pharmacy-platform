Gulf Pharmacy — Premium Digital Experience
<p align="center"><strong>GULF PHARMACY · صيدلية الخليج</strong><br/>A premium bilingual pharmacy experience for Ar Rabi, Dammam, Saudi Arabia.</p><p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-App_Router-111827?style=for-the-badge&logo=nextdotjs" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS-REST-E0234E?style=for-the-badge&logo=nestjs" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
</p>Project status: Phase 1 foundation and Phase 2 secure staff administration are implemented. Phase 3 is proposed, not implemented. This README describes the next design and development milestone without claiming unfinished functionality.

Vision
Create a visually distinctive, fast, accessible and trustworthy pharmacy website that makes it effortless to discover Gulf Pharmacy, contact staff, and navigate to its Dammam branch. Design quality should be comparable to premium global healthcare websites, without unsupported medical or commercial claims.
Brand system
Token	Value	Usage
Deep teal	#063E3B	Navigation, footer, dark editorial sections
Brand green	#08796D	Primary actions, accents, icons
Soft mint	#DFF5EC	Supporting surfaces and highlights
Canvas	#F7FAF8	Page background
Text	#173D39	Main headings and body text


Typography: bundled local Latin and Arabic fonts, clear RTL/LTR handling, generous line height. Imagery: genuine, authorized pharmacy photography preferred. Until provided, use clearly labeled illustrative assets with suitable licenses.
Phase 3 experience direction
1. Cinematic homepage
- Refined animated hero with premium photo or lightweight optimized video, subtle gradients and organic SVG accents.
- Strong, concise headline, primary WhatsApp CTA, secondary Google Maps CTA.
- Responsive split layout on desktop, carefully composed stacked layout on mobile.
- Entrance animations limited to opacity/transform, no intrusive autoplay audio.
2. Visual storytelling
- Scroll-reveal sections with consistent rhythm and tasteful parallax only where performant.
- Editorial About section featuring Dr. Fahad Badshah, using an authentic portrait only with permission.
- Pharmacy interior/gallery module with accessible lightbox once real photos are available.
- Animated cards for example product categories; publish only confirmed categories and inventory information.
3. Customer engagement
- Persistent WhatsApp CTA with a prefilled general enquiry.
- Guided FAQ chat widget for address, contact, directions, and routing product enquiries to staff.
- Clear disclosure that the assistant is automated; never give diagnoses, prescriptions, or invented prices/stock.
- Consent-aware, aggregate analytics for WhatsApp clicks, directions clicks, and campaign attribution.
4. Full bilingual experience
- English and Arabic routes/locales, correct lang and dir, mirrored RTL layout, translated metadata.
- Language switch retains the current page and route.
- Do not treat machine-translated medical information as verified without review.
5. Conversion and discovery
- Local SEO with verified business name, address, and phone.
- Structured data only for confirmed facts; omit unverified hours and ratings.
- Accessible FAQ, fast mobile loading, social sharing preview, and verified campaign banners.
- No fake reviews, fabricated urgency, unsupported discounts or regulated product promotions.
Motion design guidelines
Element	Effect	Implementation
Hero headline	Staggered fade/translate	CSS / Framer Motion
Hero background	Subtle depth movement	Transform only
CTA buttons	Hover lift, focus ring	CSS transitions
Category cards	Staggered reveal	IntersectionObserver / Motion
Image gallery	Gentle scale and lightbox	Accessible modal
Chat widget	Slide/fade, keyboard focus	Client component
Language switch	Instant route change	Locale-aware navigation


Respect prefers-reduced-motion; disable nonessential motion. Avoid heavy WebGL, excessive particles, layout-shifting effects and animations that obstruct content. Optimize LCP, CLS and INP.
Suggested public page composition
[Announcement bar: verified message only]
[Sticky logo | Home | About | Categories | Contact | Language | WhatsApp]
[Premium hero + authentic photo + 2 CTAs]
[Trust-building factual information]
[About Gulf Pharmacy / Dr. Fahad Badshah]
[Visual category exploration — verified categories only]
[Pharmacy gallery — when actual images are supplied]
[Helpful FAQ and guided chat]
[Contact / exact address / Google Maps directions]
[Footer / bilingual details / privacy]
[Floating WhatsApp + accessible assistant]
Confirmed business information
Field	Value
English name	Gulf Pharmacy
Arabic name	صيدلية الخليج
Contact	Dr. Fahad Badshah / د. فهد بادشاه
Phone and WhatsApp	+966 59 771 3349
Address	Street 8, Ar Rabi, Dammam 32241, Saudi Arabia
WhatsApp	https://wa.me/966597713349
Google Maps	https://goo.gl/maps/mhWvzaZhw956to9o8?g_st=aw
Email	Do not display


Not yet confirmed: business hours, live product catalog, stock, pricing, delivery, insurance, promotions, reviews, additional branches, and photography. Do not invent them.
Existing stack and architecture
Node.js 24 LTS, pnpm workspaces, Next.js App Router, React, strict TypeScript, Tailwind CSS, NestJS REST API, PostgreSQL 17, Drizzle migrations, Redis 7, Docker Compose, ESLint, Prettier. Latin and Arabic fonts are bundled locally.

Preserve existing API contracts, migrations, branch membership rules, audit logs, Argon2id password storage, hashed server-managed sessions, secure cookies, CSRF protection, Redis rate limits, and branch isolation. Phase 3 must be additive and must not weaken Phase 2 security.
Quick start (PowerShell)
Start Docker Desktop, then run from the repository root:
pnpm install
Copy-Item infra/.env.example infra/.env
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env
Copy-Item packages/database/.env.example packages/database/.env
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev
Copy .env templates only on first setup. Never overwrite existing customizations. Existing local PostgreSQL uses port 55432; fresh templates recommend 5433.
- Public frontend: http://localhost:3000
- API: http://localhost:4000/api
- Liveness: http://localhost:4000/api/health
- Dependency readiness: http://localhost:4000/api/health/dependencies
- Branches: http://localhost:4000/api/branches
- Staff login: http://localhost:3000/admin/login
After migrations, bootstrap the first Super Admin interactively:
pnpm auth:bootstrap
No default admin credentials or public staff registration.
Development commands
Command	Purpose
pnpm dev	Start apps with internal packages
pnpm dev:web / pnpm dev:api	Start one application
pnpm build	Build packages and applications
pnpm lint	Run ESLint
pnpm typecheck	Check strict TypeScript and route types
pnpm test	Run foundation and security tests
pnpm test:browser	Chrome desktop, tablet and mobile workflows; frontend required
pnpm format / pnpm format:check	Format or verify formatting
pnpm db:up / pnpm db:down	Start/stop infrastructure without deleting volumes
pnpm db:generate	Generate versioned migration
pnpm db:migrate	Apply checked-in migrations
pnpm db:seed	Insert missing confirmed branch, preserving edits


Phase 3 implementation sequence
1. Audit existing apps/web routes, components, styles, content, and current tests.
2. Define reusable tokens, typography, animation presets and responsive component library.
3. Build bilingual public shell, hero and accessible navigation.
4. Add factual About, Contact, Directions and verified-category sections.
5. Add optimized photography/gallery with appropriate licenses and permissions.
6. Add guided FAQ assistant and WhatsApp handoff, with no sensitive medical-data collection.
7. Add staff-managed content only through existing authorization and audit controls.
8. Test RTL, reduced motion, keyboard accessibility, Core Web Vitals and mobile breakpoints.
9. Verify all business facts, legal requirements, links, analytics consent and campaign claims before deployment.
Acceptance criteria
- All public pages work in English and Arabic, including RTL.
- Mobile, tablet and desktop layouts are visually consistent.
- All CTAs resolve to the exact confirmed links.
- No unverified claims or fabricated business data are displayed.
- Accessible keyboard navigation and reduced-motion support.
- Images optimized, layout shifts controlled, no unnecessary heavy animation.
- Phase 1 and Phase 2 regression suites remain green.
- Existing branch/admin security boundaries remain unchanged.
Existing project documentation
- [Windows setup](docs/SETUP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Authentication and permissions](docs/AUTHENTICATION.md)
- [Folder structure](docs/FOLDER_STRUCTURE.md)
- [Dependencies](docs/DEPENDENCIES.md)
- [Testing](docs/TESTING.md)
- [Development phases](docs/DEVELOPMENT_PHASES.md)
- [Phase 1 validation](docs/VALIDATION.md)
- [Phase 2 validation](docs/PHASE_2_VALIDATION.md)
These relative links refer to the existing repository documentation. This standalone README does not bundle those files.
