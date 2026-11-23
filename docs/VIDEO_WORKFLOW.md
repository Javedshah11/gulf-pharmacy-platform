# Video workflow

1. A PHARMACIST with source branch membership creates a DRAFT with bilingual metadata and category.
2. Authenticated upload reserves storage quota transactionally and enters UPLOADING. The server validates length, MIME and MP4/MOV signature, writes a generated private source, records its SHA-256 checksum and enters PROCESSING.
3. BullMQ performs FFprobe/FFmpeg work outside HTTP requests. Valid output becomes a private MP4 and thumbnail; successful processing returns the video to DRAFT. Failures become PROCESSING_FAILED after permanent rejection or exhausted retries. The UI polls real processing state every three seconds.
4. Staff complete bilingual descriptions and supporting references. A processed draft can be submitted from DRAFT, CHANGES_REQUESTED or REJECTED. Submission snapshots its revision, references and source checksum, then enters PENDING_REVIEW.
5. A specifically assigned MEDICAL_REVIEWER with source branch membership records APPROVE, REJECT or CHANGES_REQUESTED with required notes. State becomes APPROVED, REJECTED or CHANGES_REQUESTED respectively.
6. A separate independent Super Admin records a COMPLIANCE decision. General education can explicitly record NOT_REQUIRED. Regulated promotions require an actual authorization reference and future validity. Medical approval cannot substitute for this decision.
7. A Super Admin explicitly publishes an APPROVED video. Backend checks both current revision approvals, READY media, active category, active/published branch, and any required regulatory authorization. State becomes PUBLISHED.
8. Super Admin archiving changes eligible content to ARCHIVED and ends public access. To create revised content after archival, create a new draft; archived records and audit history are retained.

Metadata, references, media replacement and captions are revision changes. Editing a DRAFT, CHANGES_REQUESTED, REJECTED, APPROVED, PUBLISHED or PROCESSING_FAILED record resets it to DRAFT and clears medical/compliance approvals, attribution approval, regulatory reference/validity and public publication time. Source media replacement additionally enters UPLOADING/PROCESSING. UPLOADING, PROCESSING and PENDING_REVIEW cannot be edited. Rejected or requested-change submissions can be corrected and resubmitted. Direct publication of a draft is never allowed.

All business mutations revalidate the active staff account/session inside a database transaction and serialize access to the relevant video row. Workflow, content revisions, reviewer assignment, processing outcomes and decisions use the existing `admin_audit_logs`. Review records are append-only through the API, reference the revision and reviewer, and remain private. Submission snapshots support review provenance without storing media in PostgreSQL.

`ALL_BRANCHES` permits public distribution across published branches. It does not grant private editing or medical-review access outside source branch membership. Branch Admins can manage scoped metadata and submit for review; they cannot upload on behalf of a pharmacist, medically approve, record central compliance approval, or publish.
