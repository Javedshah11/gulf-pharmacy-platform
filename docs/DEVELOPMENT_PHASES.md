# Development phases

Phases 1 and 2 were specified in detail. The remaining sequence is a proposed roadmap; later scope needs confirmation before implementation.

1. **Foundation — implemented, validation recorded separately.** Monorepo, bilingual homepage, NestJS branch/health endpoints, PostgreSQL/Drizzle, Redis, local Compose, quality tooling, and documentation. See VALIDATION.md for actual executed results.
2. **Access and branch administration — implemented; see PHASE_2_VALIDATION.md.** Argon2id staff authentication, server-managed sessions, CSRF and brute-force defenses, Super Admin bootstrap, branch memberships, protected administration, audit logs, and self-service password changes. Pharmacist and Medical Reviewer role names are reserved without their feature workflows.
3. **Educational content.** Pharmacist content workflow, video storage, moderation, and public presentation.
4. **AI assistance.** Approved knowledge sources, chatbot boundaries, evaluation, and escalation to a pharmacist.
5. **Customer engagement.** QR campaigns, consent-aware WhatsApp integration, and marketing workflows.
6. **Analytics and operational readiness.** Reporting, observability, backup/recovery, deployment hardening, and expansion to confirmed additional branches.

Phase 1 browser automation is now available and its remaining checks are recorded in Phase 2 validation. Do not begin Phase 3 until Phase 2 passes verification and its next scope is authorized. No AI, video uploads, workers, or marketing automation are included now.
