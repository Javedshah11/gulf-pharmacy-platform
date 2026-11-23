# Development phases

Phases 1–3 were specified and implemented incrementally. Later scope remains a proposed roadmap and needs authorization before implementation.

1. **Foundation — implemented, validation recorded separately.** Monorepo, bilingual homepage, NestJS branch/health endpoints, PostgreSQL/Drizzle, Redis, local Compose, quality tooling, and documentation. See VALIDATION.md for actual executed results.
2. **Access and branch administration — implemented; see PHASE_2_VALIDATION.md.** Argon2id staff authentication, server-managed sessions, CSRF and brute-force defenses, Super Admin bootstrap, branch memberships, protected administration, audit logs, and self-service password changes. Pharmacist and Medical Reviewer role names are reserved without their feature workflows.
3. **Multi-branch public website and local SEO — implemented; see PHASE_3_VALIDATION.md.** Server-rendered English/Arabic routes, branch discovery/profiles, contact actions, structured business content, protected publication management, and origin-based SEO.
4. **Gulf Health Academy — implemented; see PHASE_4_VALIDATION.md.** Private pharmacist uploads, BullMQ/FFmpeg worker, assigned independent medical review, separate compliance authorization, revision-based publishing gates, bilingual public video library, controlled playback and aggregate engagement signals. No live educational videos are seeded.
5. **AI assistance and customer engagement — not started.** Proposed knowledge sources, evaluated chatbot behavior, QR campaigns, consent-aware WhatsApp integration, and engagement workflows.
6. **Analytics and operational readiness.** Reporting, observability, backup/recovery, deployment hardening, and expansion to confirmed additional branches.

Do not begin Phase 5 automatically. No AI marketing, customer registration, prescription handling or customer messaging is included in Phase 4. Future branch records require verified real-world business information.
