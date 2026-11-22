import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
} from '@nestjs/common';
import { createDatabase } from '@gulf/database';
import { ENVIRONMENT, type Environment } from '../config/environment';
@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  readonly db;
  private readonly pool;
  constructor(@Inject(ENVIRONMENT) env: Environment) {
    const connection = createDatabase(env.DATABASE_URL);
    this.db = connection.db;
    this.pool = connection.pool;
    this.pool.on('error', () =>
      new Logger(DatabaseService.name).warn(
        'PostgreSQL connection unavailable',
      ),
    );
  }
  async ping() {
    await this.pool.query('SELECT 1');
  }
  async onApplicationShutdown() {
    await this.pool.end();
  }
}
