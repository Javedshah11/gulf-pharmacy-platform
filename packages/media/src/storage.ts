import { promises as fs, createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import { Transform, type Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createHash } from 'node:crypto';
export class MediaFault extends Error {
  constructor(public code: string) {
    super(code);
  }
}
export interface MediaStorage {
  initialize(): Promise<void>;
  path(key: string): string;
  removePrefix(id: string): Promise<void>;
}
export class LocalMediaStorage implements MediaStorage {
  constructor(readonly root: string) {}
  async initialize() {
    await fs.mkdir(this.root, { recursive: true, mode: 0o700 });
    const stat = await fs.lstat(this.root);
    if (stat.isSymbolicLink() || !stat.isDirectory())
      throw new MediaFault('INVALID_STORAGE_ROOT');
  }
  path(key: string) {
    if (
      !/^[a-f0-9-]{36}\/(?:source\.bin|playback\.mp4|thumbnail\.jpg|caption-(?:en|ar)-[a-f0-9-]{36}\.vtt|work-[a-f0-9-]{36}\/(?:playback\.mp4|thumbnail\.jpg))$/.test(
        key,
      )
    )
      throw new MediaFault('INVALID_STORAGE_KEY');
    const result = path.resolve(this.root, key);
    if (!result.startsWith(path.resolve(this.root) + path.sep))
      throw new MediaFault('INVALID_STORAGE_KEY');
    return result;
  }
  async createPrefix(id: string) {
    if (!/^[a-f0-9-]{36}$/.test(id))
      throw new MediaFault('INVALID_STORAGE_KEY');
    await this.initialize();
    await fs.mkdir(path.join(this.root, id), { mode: 0o700 });
  }
  async removePrefix(id: string) {
    if (!/^[a-f0-9-]{36}$/.test(id))
      throw new MediaFault('INVALID_STORAGE_KEY');
    const target = path.resolve(this.root, id);
    if (!target.startsWith(path.resolve(this.root) + path.sep))
      throw new MediaFault('INVALID_STORAGE_KEY');
    const stat = await fs.lstat(target).catch(() => null);
    if (stat?.isSymbolicLink()) throw new MediaFault('INVALID_STORAGE_KEY');
    await fs.rm(target, { recursive: true, force: true });
  }
  async removeFile(key: string) {
    await fs.unlink(this.path(key)).catch(() => undefined);
  }
  async writeUpload(
    id: string,
    input: Readable,
    expected: number,
    max: number,
    timeoutSeconds: number,
  ) {
    const target = this.path(id + '/source.bin');
    let size = 0;
    let prefix = Buffer.alloc(0);
    let validated = false;
    const checksum = createHash('sha256');
    const control = new AbortController();
    const timer = setTimeout(() => control.abort(), timeoutSeconds * 1000);
    const verifier = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        size += chunk.length;
        if (size > max || size > expected) {
          callback(new MediaFault('UPLOAD_TOO_LARGE'));
          return;
        }
        checksum.update(chunk);
        if (!validated) {
          prefix = Buffer.concat([prefix, chunk]);
          if (prefix.length < 16) {
            callback();
            return;
          }
          const brand = prefix.toString('ascii', 8, 12);
          if (
            prefix.toString('ascii', 4, 8) !== 'ftyp' ||
            ![
              'isom',
              'iso2',
              'mp41',
              'mp42',
              'avc1',
              'M4V ',
              'qt  ',
              'MSNV',
            ].includes(brand)
          ) {
            callback(new MediaFault('INVALID_MEDIA_SIGNATURE'));
            return;
          }
          validated = true;
          this.push(prefix);
          prefix = Buffer.alloc(0);
        } else this.push(chunk);
        callback();
      },
    });
    try {
      input.pipe(verifier);
      const onError = () =>
        verifier.destroy(new MediaFault('INCOMPLETE_UPLOAD'));
      input.once('error', onError);
      input.once('aborted', onError);
      try {
        await pipeline(
          verifier,
          createWriteStream(target, { flags: 'wx', mode: 0o600 }),
          { signal: control.signal },
        );
      } finally {
        input.unpipe(verifier);
        input.off('error', onError);
        input.off('aborted', onError);
        input.resume();
      }
      if (!validated || size !== expected)
        throw new MediaFault('INCOMPLETE_UPLOAD');
      return { fileSize: size, checksum: checksum.digest('hex') };
    } finally {
      clearTimeout(timer);
    }
  }
  read(key: string, range?: { start: number; end: number }) {
    return createReadStream(this.path(key), range);
  }
}
