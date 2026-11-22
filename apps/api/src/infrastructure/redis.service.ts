import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
} from '@nestjs/common';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import { ENVIRONMENT, type Environment } from '../config/environment';
@Injectable()
export class RedisService implements OnApplicationShutdown {
  private readonly client: Redis;
  private readonly ratePrefix: string;
  constructor(@Inject(ENVIRONMENT) env: Environment) {
    this.ratePrefix =
      env.NODE_ENV === 'test' ? 'gulf:test:' + randomUUID() : 'gulf:login';
    this.client = new Redis(env.REDIS_URL, {
      connectTimeout: 2000,
      commandTimeout: 2000,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 500, 5000),
    });
    this.client.on('error', () =>
      new Logger(RedisService.name).warn('Redis connection unavailable'),
    );
  }
  async ping() {
    const reply = await this.client.ping();
    if (reply !== 'PONG') throw new Error('Redis unavailable');
  }
  async consumeLoginAttempt(
    ipHash: string,
    accountHash: string,
  ): Promise<boolean> {
    const result = await this.client.eval(
      `
      local ip = redis.call('INCR', KEYS[1])
      if ip == 1 then redis.call('EXPIRE', KEYS[1], 900) end
      local account = redis.call('INCR', KEYS[2])
      if account == 1 then redis.call('EXPIRE', KEYS[2], 900) end
      if ip > 30 or account > 5 then return 0 end
      return 1
    `,
      2,
      this.ratePrefix + ':ip:' + ipHash,
      this.ratePrefix + ':account:' + accountHash,
    );
    return result === 1;
  }
  async onApplicationShutdown() {
    try {
      if (this.client.status === 'ready') await this.client.quit();
    } finally {
      this.client.disconnect();
    }
  }
}
