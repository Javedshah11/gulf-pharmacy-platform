# Private video storage and worker

Default storage is `<repository>/.local/media`, outside Next public files and ignored by Git. API and worker use the same absolute `MEDIA_STORAGE_ROOT` and Redis queue name. Files belong to UUID upload generations, not user filenames. SOURCE bytes are never publicly or privately served through asset endpoints. Only current-generation processed playback, thumbnail and supplied captions have controlled delivery.

`packages/media` isolates local filesystem operations, storage-key validation, upload verification, media execution and queue construction. A future object-storage adapter must implement these storage operations and change the worker's local staging boundary; neither the public API nor clients should accept an arbitrary path or object key. This release uses persistent local storage only.

The local adapter restricts keys to generated UUID/file patterns, checks resolved paths stay below the configured root, refuses symbolic storage roots, uses exclusive source creation and restrictive POSIX modes. On Windows, deploy under an account with a restricted directory ACL. Media is never interpreted as a script or passed to a shell. FFmpeg receives fixed argument arrays, protocol restrictions, disabled external MOV references, bounded input dimensions (3840×2160), frame rate (60), stream count (8), duration, output size, thread count, allocation limit and execution time. Output is H.264/AAC MP4, at most 1280×720 / 30 fps, with fast-start and a JPEG thumbnail. Output duration is checked to reject truncation.

| Setting                       | Default                   |
| ----------------------------- | ------------------------- |
| MEDIA_STORAGE_ROOT            | repository `.local/media` |
| MEDIA_MAX_UPLOAD_MB           | 100 (configurable 1–500)  |
| MEDIA_QUOTA_MB                | 5120 (50–102400)          |
| MEDIA_MAX_DURATION_SECONDS    | 900                       |
| MEDIA_UPLOAD_TIMEOUT_SECONDS  | 120                       |
| MEDIA_PROCESS_TIMEOUT_SECONDS | 300                       |
| MEDIA_WORKER_CONCURRENCY      | 1 (maximum 4)             |
| MEDIA_QUEUE_NAME              | gulf-health-media         |
| FFMPEG_PATH / FFPROBE_PATH    | ffmpeg / ffprobe on PATH  |

Quota reservations serialize through a PostgreSQL advisory transaction lock. An accepted upload reserves source length plus two maximum-sized outputs and 4 MB headroom. READY generations account for actual source/output/thumbnail sizes plus 2 MB captions headroom. Failed incomplete uploads release their reservation after file removal. Completed and archived media continue consuming quota. Failed processing retains the source and reservation for diagnosis/retry; replace it to release superseded storage. There is no unaudited public deletion endpoint.

The upload row acts as a durable QUEUED outbox. The worker scans it every ten seconds, so temporary queue delivery failure does not lose accepted uploads. BullMQ uses deterministic upload/retry job IDs, three attempts with exponential backoff, bounded retained job histories and configured concurrency. A PostgreSQL advisory lock per upload prevents duplicate concurrent transcoding; READY generations are idempotent. A manual retry creates a new deterministic job ID and is limited to five attempts per upload generation. Invalid media is a permanent failure; tool/connection failures can retry.

UUID temporary work directories are removed in `finally`, successful outputs are renamed into their generation, and failed/partial source uploads are cleaned. The worker removes STREAMING uploads abandoned for over 30 minutes and releases their reservation. Replaced generations are removed after a new source has been accepted. Database review/version records retain provenance. Back up PostgreSQL and media together; Redis can be restarted without losing QUEUED uploads. Ctrl+C/SIGTERM closes worker, queue and database connections.

For deployment, run the worker under a nonprivileged isolated account/container with explicit CPU/memory/storage limits and no network egress, keep FFmpeg patched, and use durable storage shared with the API. Process flags bound expected workloads but are not an operating-system sandbox. This local implementation has no HLS/object-store deployment or external malware scanning dependency.
