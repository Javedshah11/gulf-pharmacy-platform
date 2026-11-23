import path from 'node:path';
import { z } from 'zod';
export const MEDIA_QUEUE = 'gulf-health-media';
export function mediaConfig(input: NodeJS.ProcessEnv = process.env) {
  const s = z.object({
    MEDIA_STORAGE_ROOT: z
      .string()
      .default(path.resolve(__dirname, '../../../.local/media')),
    MEDIA_MAX_UPLOAD_MB: z.coerce.number().int().min(1).max(500).default(100),
    MEDIA_QUOTA_MB: z.coerce.number().int().min(50).max(102400).default(5120),
    MEDIA_MAX_DURATION_SECONDS: z.coerce
      .number()
      .int()
      .min(1)
      .max(3600)
      .default(900),
    MEDIA_PROCESS_TIMEOUT_SECONDS: z.coerce
      .number()
      .int()
      .min(1)
      .max(1800)
      .default(300),
    MEDIA_UPLOAD_TIMEOUT_SECONDS: z.coerce
      .number()
      .int()
      .min(5)
      .max(600)
      .default(120),
    MEDIA_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(4).default(1),
    MEDIA_QUEUE_NAME: z
      .string()
      .regex(/^[a-zA-Z0-9_-]{1,120}$/)
      .default(MEDIA_QUEUE),
    FFMPEG_PATH: z.string().default('ffmpeg'),
    FFPROBE_PATH: z.string().default('ffprobe'),
  });
  const result = s.safeParse(input);
  if (!result.success)
    throw new Error(
      'Invalid media configuration: ' +
        result.error.issues.map((i) => i.path.join('.')).join(', '),
    );
  return {
    ...result.data,
    MEDIA_STORAGE_ROOT: path.resolve(result.data.MEDIA_STORAGE_ROOT),
  };
}
export type MediaConfig = ReturnType<typeof mediaConfig>;
export function redisConnection(value: string) {
  const u = new URL(value);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    username: u.username ? decodeURIComponent(u.username) : undefined,
    password: u.password ? decodeURIComponent(u.password) : undefined,
    db: Number(u.pathname.slice(1) || 0),
    ...(u.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}
