import {
  Inject,
  Injectable,
  ServiceUnavailableException,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import {
  randomBytes,
  createHmac,
  createCipheriv,
  createDecipheriv,
  timingSafeEqual,
  createHash,
} from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ENVIRONMENT, type Environment } from '../config/environment';
import { RedisService } from '../infrastructure/redis.service';
export const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');
@Injectable()
export class EngagementSecurity {
  private secret?: Buffer;
  constructor(
    @Inject(ENVIRONMENT) readonly env: Environment,
    private readonly redis: RedisService,
  ) {}
  private key() {
    if (this.secret) return this.secret;
    if (this.env.ENGAGEMENT_ENCRYPTION_KEY)
      return (this.secret = Buffer.from(
        this.env.ENGAGEMENT_ENCRYPTION_KEY,
        'hex',
      ));
    if (this.env.NODE_ENV === 'production')
      throw new ServiceUnavailableException(
        'Subscription encryption is not configured',
      );
    const folder = path.join(this.env.MEDIA_STORAGE_ROOT, '.secrets');
    mkdirSync(folder, { recursive: true, mode: 0o700 });
    const file = path.join(folder, 'engagement.key');
    try {
      writeFileSync(file, randomBytes(32), { flag: 'wx', mode: 0o600 });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
    }
    const key = readFileSync(file);
    if (key.length !== 32)
      throw new ServiceUnavailableException(
        'Invalid engagement encryption configuration',
      );
    return (this.secret = key);
  }
  hash(value: string) {
    return createHmac('sha256', this.key()).update(value).digest('hex');
  }
  encrypt(value: string) {
    const iv = randomBytes(12),
      cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const bytes = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), bytes]).toString('base64');
  }
  decrypt(value: string) {
    const b = Buffer.from(value, 'base64'),
      cipher = createDecipheriv('aes-256-gcm', this.key(), b.subarray(0, 12));
    cipher.setAuthTag(b.subarray(12, 28));
    return Buffer.concat([
      cipher.update(b.subarray(28)),
      cipher.final(),
    ]).toString('utf8');
  }
  sign(value: Record<string, unknown>) {
    const body = Buffer.from(
      JSON.stringify({
        ...value,
        expires: Math.floor(Date.now() / 3600000) * 3600000 + 7200000,
      }),
    ).toString('base64url');
    return body + '.' + this.hash('context:' + body);
  }
  verify(value: string) {
    if (value.length > 3000)
      throw new BadRequestException('Invalid event context');
    const [body, signature] = value.split('.');
    if (
      !body ||
      !signature ||
      !/^[a-f0-9]{64}$/.test(signature) ||
      !timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(this.hash('context:' + body)),
      )
    )
      throw new BadRequestException('Invalid event context');
    let data;
    try {
      data = JSON.parse(Buffer.from(body, 'base64url').toString());
    } catch {
      throw new BadRequestException('Invalid event context');
    }
    if (!data.expires || data.expires < Date.now())
      throw new BadRequestException('Event context expired');
    return data as {
      branchId: string | null;
      qrId: string | null;
      campaignId: string | null;
      videoId: string | null;
      source: string;
      expires: number;
    };
  }
  async limit(ip: string, scope: string, max: number, seconds = 60) {
    const key = this.hash(
      'rate:' + new Date().toISOString().slice(0, 10) + ':' + ip + ':' + scope,
    );
    if (!(await this.redis.consumePublic(key, max, seconds)))
      throw new HttpException('Too many requests; please try again later', 429);
  }
  async unique(ip: string, key: string) {
    return this.redis.uniquePublic(this.hash('unique:' + ip + ':' + key), 60);
  }
}
