import { Global, Module } from '@nestjs/common';
import { ENVIRONMENT, validateEnvironment } from '../config/environment';
import { DatabaseService } from './database.service';
import { RedisService } from './redis.service';
@Global()
@Module({
  providers: [
    { provide: ENVIRONMENT, useFactory: validateEnvironment },
    DatabaseService,
    RedisService,
  ],
  exports: [ENVIRONMENT, DatabaseService, RedisService],
})
export class InfrastructureModule {}
