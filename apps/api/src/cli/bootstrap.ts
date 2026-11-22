import 'dotenv/config';
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import {
  createDatabase,
  staffUsers,
  adminAuditLogs,
  eq,
  sql,
} from '@gulf/database';
import { validateEnvironment } from '../config/environment';
import { hashPassword } from '../auth/password';

async function main() {
  const { db, pool } = createDatabase(validateEnvironment().DATABASE_URL);
  let terminal: ReturnType<typeof createInterface> | undefined;
  try {
    const [existing] = await db
      .select({ id: staffUsers.id })
      .from(staffUsers)
      .where(eq(staffUsers.role, 'SUPER_ADMIN'))
      .limit(1);
    if (existing) {
      console.log('A Super Admin already exists. No changes made.');
      return;
    }
    if (!process.stdin.isTTY || !process.stdout.isTTY)
      throw new Error('Run bootstrap in an interactive terminal.');
    let muted = false;
    const output = new Writable({
      write(chunk, _encoding, callback) {
        if (!muted) process.stdout.write(chunk);
        callback();
      },
    });
    terminal = createInterface({
      input: process.stdin,
      output,
      terminal: true,
    });
    const ask = (prompt: string, secret = false) =>
      new Promise<string>((resolve, reject) => {
        process.stdout.write(prompt);
        muted = secret;
        terminal!.question('', (answer) => {
          muted = false;
          if (secret) process.stdout.write('\n');
          resolve(answer);
        });
        terminal!.once('SIGINT', () => {
          terminal?.close();
          reject(new Error('Bootstrap cancelled.'));
        });
      });
    const username = (await ask('Super Admin username: ')).trim().toLowerCase();
    const displayName = (await ask('Display name: ')).trim();
    if (
      !/^[a-z0-9][a-z0-9._-]{2,79}$/.test(username) ||
      displayName.length < 1 ||
      displayName.length > 160
    )
      throw new Error('Invalid username or display name.');
    const password = await ask('Password (15–128 characters, hidden): ', true);
    const confirmation = await ask('Confirm password (hidden): ', true);
    if (
      password.length < 15 ||
      password.length > 128 ||
      password !== confirmation
    )
      throw new Error('Password requirements or confirmation failed.');
    const passwordHash = await hashPassword(password);
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(780124801)`);
      const [root] = await tx
        .select({ id: staffUsers.id })
        .from(staffUsers)
        .where(eq(staffUsers.role, 'SUPER_ADMIN'))
        .limit(1);
      if (root) {
        console.log('A Super Admin already exists. No changes made.');
        return;
      }
      const [user] = await tx
        .insert(staffUsers)
        .values({ username, displayName, passwordHash, role: 'SUPER_ADMIN' })
        .onConflictDoNothing({ target: staffUsers.username })
        .returning({ id: staffUsers.id });
      if (!user) throw new Error('Username unavailable.');
      await tx.insert(adminAuditLogs).values({
        actorId: user.id,
        action: 'staff.bootstrap',
        targetId: user.id,
      });
      console.log('Super Admin created. Sign in through /admin/login.');
    });
  } finally {
    terminal?.close();
    await pool.end();
  }
}
main().catch(() => {
  console.error(
    'Bootstrap did not complete. Check input requirements, database connectivity, and migrations. No password has been printed.',
  );
  process.exitCode = 1;
});
