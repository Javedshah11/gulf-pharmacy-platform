import 'dotenv/config';
import { config as loadEnvironment } from 'dotenv';
import path from 'node:path';
import { createDatabase } from '@gulf/database';
import {
  mediaConfig,
  mediaQueue,
  createMediaWorker,
  dispatchPending,
  cleanAbandoned,
  LocalMediaStorage,
} from '@gulf/media';
async function main() {
  loadEnvironment({
    path: path.resolve(__dirname, '../../api/.env'),
    quiet: true,
  });
  if (!process.env.DATABASE_URL || !process.env.REDIS_URL)
    throw new Error('DATABASE_URL and REDIS_URL are required');
  const c = mediaConfig();
  const database = createDatabase(process.env.DATABASE_URL);
  const queue = mediaQueue(process.env.REDIS_URL, c);
  const worker = createMediaWorker(database, process.env.REDIS_URL, c);
  worker.on('error', () =>
    console.error('Media worker connection unavailable'),
  );
  worker.on('failed', () =>
    console.error('Media job failed; inspect authorized processing status'),
  );
  let busy = false;
  const sweep = async () => {
    if (busy) return;
    busy = true;
    try {
      await cleanAbandoned(
        database,
        new LocalMediaStorage(c.MEDIA_STORAGE_ROOT),
      );
      await dispatchPending(database, queue);
    } catch {
      console.error('Media dispatch unavailable');
    } finally {
      busy = false;
    }
  };
  let pending = Promise.resolve();
  const timer = setInterval(() => {
    pending = pending.then(sweep);
  }, 10000);
  await sweep();
  await worker.waitUntilReady();
  console.log('Gulf media worker ready');
  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    clearInterval(timer);
    await pending;
    await worker.close();
    await queue.close();
    await database.pool.end();
  };
  process.once('SIGINT', () => void close());
  process.once('SIGTERM', () => void close());
}
void main().catch(() => {
  console.error(
    'Media worker startup failed. Check services and configuration.',
  );
  process.exitCode = 1;
});
