import * as engagementSchema from './engagement-schema';
export * from './engagement-schema';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import * as healthSchema from './health-schema';
export * from './health-schema';
export {
  branches,
  staffUsers,
  branchMemberships,
  authSessions,
  adminAuditLogs,
} from './schema';
export {
  eq,
  and,
  or,
  ilike,
  asc,
  desc,
  sql,
  inArray,
  isNull,
  gt,
  ne,
} from 'drizzle-orm';
export { migrate } from 'drizzle-orm/node-postgres/migrator';
export function createDatabase(url: string) {
  const pool = new Pool({
    connectionString: url,
    connectionTimeoutMillis: 3000,
    max: 10,
    query_timeout: 3000,
  });
  return {
    pool,
    db: drizzle(pool, {
      schema: { ...schema, ...healthSchema, ...engagementSchema },
    }),
  };
}
