import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDatabase } from './index';
import { databaseUrl } from './environment';
async function main() {
  const { db, pool } = createDatabase(databaseUrl());
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Migrations applied.');
  } finally {
    await pool.end();
  }
}
main().catch(() => {
  console.error(
    'Migration failed. Check database availability and configuration.',
  );
  process.exitCode = 1;
});
