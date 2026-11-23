import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Worker, Queue, UnrecoverableError, type Job } from 'bullmq';
import {
  createDatabase,
  healthVideoUploads as uploads,
  healthVideos as videos,
  healthVideoAssets as assets,
  adminAuditLogs,
  eq,
  and,
  sql,
} from '@gulf/database';
import { LocalMediaStorage, MediaFault } from './storage';
import { type MediaConfig, redisConnection } from './config';
type Database = ReturnType<typeof createDatabase>;
function command(
  executable: string,
  args: string[],
  timeout: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    let bytes = 0;
    let failed = false;
    const timer = setTimeout(() => {
      failed = true;
      child.kill('SIGKILL');
    }, timeout * 1000);
    child.stdout.on('data', (b: Buffer) => {
      bytes += b.length;
      if (bytes > 1024 * 1024) {
        failed = true;
        child.kill('SIGKILL');
      } else output += b.toString();
    });
    child.stderr.on('data', () => undefined);
    child.on('error', () => {
      clearTimeout(timer);
      reject(new MediaFault('MEDIA_TOOL_UNAVAILABLE'));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (failed) reject(new MediaFault('PROCESSING_LIMIT'));
      else if (code !== 0) reject(new MediaFault('INVALID_MEDIA'));
      else resolve(output);
    });
  });
}
export async function transcode(
  storage: LocalMediaStorage,
  id: string,
  c: MediaConfig,
) {
  const source = storage.path(id + '/source.bin');
  const metadata = JSON.parse(
    await command(
      c.FFPROBE_PATH,
      [
        '-v',
        'error',
        '-enable_drefs',
        '0',
        '-use_absolute_path',
        '0',
        '-protocol_whitelist',
        'file,pipe',
        '-show_format',
        '-show_streams',
        '-of',
        'json',
        source,
      ],
      Math.min(30, c.MEDIA_PROCESS_TIMEOUT_SECONDS),
    ),
  );
  const stream = metadata.streams?.find(
    (s: { codec_type: string }) => s.codec_type === 'video',
  );
  const duration = Number(metadata.format?.duration);
  const fps = String(stream?.avg_frame_rate ?? '0/1')
    .split('/')
    .map(Number);
  if (
    !stream ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > c.MEDIA_MAX_DURATION_SECONDS ||
    stream.width > 3840 ||
    stream.height > 2160 ||
    stream.width < 2 ||
    stream.height < 2 ||
    fps[0] / fps[1] > 60 ||
    metadata.streams.length > 8 ||
    !String(metadata.format?.format_name).includes('mov')
  )
    throw new MediaFault('UNSUPPORTED_MEDIA_METADATA');
  const work = 'work-' + randomUUID();
  const directory = path.dirname(
    storage.path(id + '/' + work + '/playback.mp4'),
  );
  await fs.mkdir(directory, { mode: 0o700 });
  try {
    const output = storage.path(id + '/' + work + '/playback.mp4');
    await command(
      c.FFMPEG_PATH,
      [
        '-nostdin',
        '-v',
        'error',
        '-threads',
        '1',
        '-filter_threads',
        '1',
        '-max_alloc',
        '67108864',
        '-enable_drefs',
        '0',
        '-use_absolute_path',
        '0',
        '-protocol_whitelist',
        'file,pipe',
        '-i',
        source,
        '-map',
        '0:v:0',
        '-map',
        '0:a:0?',
        '-sn',
        '-dn',
        '-vf',
        "scale=w='min(1280,iw)':h='min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
        '-r',
        '30',
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '25',
        '-threads',
        '1',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '96k',
        '-movflags',
        '+faststart',
        '-fs',
        String(c.MEDIA_MAX_UPLOAD_MB * 1024 * 1024),
        output,
      ],
      c.MEDIA_PROCESS_TIMEOUT_SECONDS,
    );
    const out = JSON.parse(
      await command(
        c.FFPROBE_PATH,
        ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', output],
        30,
      ),
    );
    const actual = Number(out.format?.duration);
    const video = out.streams?.find(
      (s: { codec_type: string }) => s.codec_type === 'video',
    );
    if (!video || Math.abs(actual - duration) > 1.5)
      throw new MediaFault('OUTPUT_SIZE_LIMIT');
    await command(
      c.FFMPEG_PATH,
      [
        '-nostdin',
        '-v',
        'error',
        '-threads',
        '1',
        '-filter_threads',
        '1',
        '-enable_drefs',
        '0',
        '-use_absolute_path',
        '0',
        '-protocol_whitelist',
        'file,pipe',
        '-i',
        output,
        '-frames:v',
        '1',
        '-vf',
        'scale=640:-2',
        '-q:v',
        '3',
        storage.path(id + '/' + work + '/thumbnail.jpg'),
      ],
      30,
    );
    for (const file of ['playback.mp4', 'thumbnail.jpg']) {
      await storage.removeFile(id + '/' + file);
      await fs.rename(
        storage.path(id + '/' + work + '/' + file),
        storage.path(id + '/' + file),
      );
    }
    return {
      durationSeconds: Math.ceil(actual),
      width: video.width as number,
      height: video.height as number,
      playbackSize: (await fs.stat(storage.path(id + '/playback.mp4'))).size,
      thumbnailSize: (await fs.stat(storage.path(id + '/thumbnail.jpg'))).size,
    };
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}
export function mediaQueue(redis: string, c: MediaConfig) {
  const queue = new Queue(c.MEDIA_QUEUE_NAME, {
    connection: {
      ...redisConnection(redis),
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
    },
  });
  queue.on('error', () => undefined);
  return queue;
}
export async function dispatchPending(
  database: Database,
  queue: ReturnType<typeof mediaQueue>,
) {
  const rows = await database.db
    .select()
    .from(uploads)
    .where(eq(uploads.state, 'QUEUED'))
    .limit(100);
  for (const u of rows)
    await queue.add(
      'process',
      { uploadId: u.id },
      { jobId: u.id + '-' + u.retryCount },
    );
}
export function createMediaWorker(
  database: Database,
  redis: string,
  c: MediaConfig,
) {
  const storage = new LocalMediaStorage(c.MEDIA_STORAGE_ROOT);
  return new Worker(
    c.MEDIA_QUEUE_NAME,
    async (job: Job<{ uploadId: string }>) => {
      const id = job.data.uploadId;
      if (!/^[a-f0-9-]{36}$/.test(id))
        throw new UnrecoverableError('INVALID_JOB');
      const lock = await database.pool.connect();
      let acquired = false;
      try {
        const result = await lock.query(
          'SELECT pg_try_advisory_lock(hashtext($1)) AS locked',
          [id],
        );
        acquired = result.rows[0].locked;
        if (!acquired) throw new Error('MEDIA_BUSY');
        const [u] = await database.db
          .select()
          .from(uploads)
          .where(eq(uploads.id, id));
        if (!u || u.state === 'READY' || u.state === 'ABANDONED') return;
        const [v] = await database.db
          .select()
          .from(videos)
          .where(eq(videos.id, u.videoId));
        if (!v || v.currentUploadId !== id) return;
        await database.db
          .update(uploads)
          .set({ state: 'PROCESSING', errorCode: null })
          .where(eq(uploads.id, id));
        try {
          const output = await transcode(storage, id, c);
          await database.db.transaction(async (tx) => {
            const [current] = await tx
              .select()
              .from(videos)
              .where(eq(videos.id, v.id))
              .for('update');
            if (current.currentUploadId !== id) return;
            for (const item of [
              {
                assetType: 'PLAYBACK' as const,
                storageKey: id + '/playback.mp4',
                mimeType: 'video/mp4',
                fileSize: output.playbackSize,
                width: output.width,
                height: output.height,
                durationSeconds: output.durationSeconds,
              },
              {
                assetType: 'THUMBNAIL' as const,
                storageKey: id + '/thumbnail.jpg',
                mimeType: 'image/jpeg',
                fileSize: output.thumbnailSize,
                width: 640,
              },
            ])
              await tx
                .insert(assets)
                .values({ ...item, videoId: v.id, uploadId: id })
                .onConflictDoUpdate({
                  target: [assets.uploadId, assets.assetType],
                  set: item,
                });
            await tx
              .update(uploads)
              .set({
                state: 'READY',
                reservedBytes:
                  u.expectedBytes +
                  output.playbackSize +
                  output.thumbnailSize +
                  2 * 1024 * 1024,
              })
              .where(eq(uploads.id, id));
            await tx
              .update(videos)
              .set({ status: 'DRAFT', durationSeconds: output.durationSeconds })
              .where(eq(videos.id, v.id));
            await tx
              .insert(adminAuditLogs)
              .values({ action: 'video.processed', targetId: v.id });
          });
        } catch (error) {
          const code =
            error instanceof MediaFault ? error.code : 'PROCESSING_UNAVAILABLE';
          const permanent = [
            'INVALID_MEDIA',
            'UNSUPPORTED_MEDIA_METADATA',
            'OUTPUT_SIZE_LIMIT',
          ].includes(code);
          const final =
            permanent || job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
          await database.db.transaction(async (tx) => {
            await tx
              .update(uploads)
              .set({ state: final ? 'FAILED' : 'PROCESSING', errorCode: code })
              .where(eq(uploads.id, id));
            if (final)
              await tx
                .update(videos)
                .set({ status: 'PROCESSING_FAILED' })
                .where(
                  and(eq(videos.id, v.id), eq(videos.currentUploadId, id)),
                );
            await tx.insert(adminAuditLogs).values({
              action: final
                ? 'video.processing_failed'
                : 'video.processing_retry_pending',
              targetId: v.id,
              details: { uploadId: id, errorCode: code },
            });
          });
          if (permanent) throw new UnrecoverableError(code);
          throw new Error(code, { cause: error });
        }
      } finally {
        if (acquired)
          await lock.query('SELECT pg_advisory_unlock(hashtext($1))', [id]);
        lock.release();
      }
    },
    {
      connection: redisConnection(redis),
      concurrency: c.MEDIA_WORKER_CONCURRENCY,
      lockDuration: 60000,
    },
  );
}
export async function cleanAbandoned(
  database: Database,
  storage: LocalMediaStorage,
) {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);
  const rows = await database.db
    .select()
    .from(uploads)
    .where(
      and(
        eq(uploads.state, 'STREAMING'),
        sql`${uploads.updatedAt} < ${cutoff}`,
      ),
    );
  for (const u of rows) {
    await storage.removePrefix(u.id);
    await database.db.transaction(async (tx) => {
      await tx
        .update(uploads)
        .set({
          state: 'ABANDONED',
          reservedBytes: 0,
          errorCode: 'UPLOAD_ABANDONED',
        })
        .where(eq(uploads.id, u.id));
      await tx
        .update(videos)
        .set({ status: 'PROCESSING_FAILED' })
        .where(
          and(eq(videos.currentUploadId, u.id), eq(videos.status, 'UPLOADING')),
        );
      await tx.insert(adminAuditLogs).values({
        action: 'video.upload_abandoned',
        targetId: u.videoId,
        details: { uploadId: u.id },
      });
    });
  }
}
