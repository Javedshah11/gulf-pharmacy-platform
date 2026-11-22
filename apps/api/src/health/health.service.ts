import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../infrastructure/database.service';
import { RedisService } from '../infrastructure/redis.service';
@Injectable()
export class HealthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly redis: RedisService,
  ) {}
  health() {
    return {
      status: 'ok',
      service: 'gulf-pharmacy-api',
      timestamp: new Date().toISOString(),
    };
  }
  async dependencies() {
    const [database, redis] = await Promise.allSettled([
      this.database.ping(),
      this.redis.ping(),
    ]);
    const checks = {
      database: database.status === 'fulfilled' ? 'up' : 'down',
      redis: redis.status === 'fulfilled' ? 'up' : 'down',
    };
    const healthy = checks.database === 'up' && checks.redis === 'up';
    const result = {
      status: healthy ? 'ok' : 'degraded',
      dependencies: checks,
    };
    if (!healthy) throw new ServiceUnavailableException(result);
    return result;
  }
}
