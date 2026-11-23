const { promises: fs } = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const apiRequire = createRequire(path.resolve(__dirname, '../../package.json'));
apiRequire('dotenv').config({
  path: path.resolve(__dirname, '../../.env'),
  quiet: true,
});
const { createDatabase, migrate, staffUsers, branches, branchMemberships, eq } =
  apiRequire('@gulf/database');
const { Test } = apiRequire('@nestjs/testing');
const { AppModule } = require('../../dist/app.module');
const {
  ENVIRONMENT,
  validateEnvironment,
} = require('../../dist/config/environment');
const {
  DatabaseService,
} = require('../../dist/infrastructure/database.service');
const { RedisService } = require('../../dist/infrastructure/redis.service');
const { AuthService } = require('../../dist/auth/auth.service');
const { configureApp } = require('../../dist/configure-app');
const { hashPassword } = require('../../dist/auth/password');

async function createHarness({
  listen = false,
  origin = 'http://localhost:3000',
} = {}) {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl)
    throw new Error(
      'DATABASE_URL is required for isolated test database provisioning.',
    );
  const databaseName =
    'gulf_pharmacy_test_' + process.pid + '_' + randomBytes(5).toString('hex');
  if (!/^gulf_pharmacy_test_\d+_[a-f0-9]+$/.test(databaseName))
    throw new Error('Unsafe test database name');
  const mediaRoot = path.resolve(
    __dirname,
    '../../../../.local/tests',
    databaseName,
  );
  const admin = createDatabase(baseUrl);
  admin.pool.options.query_timeout = 30000;
  const url = new URL(baseUrl);
  url.pathname = '/' + databaseName;
  let connection;
  let app;
  async function close() {
    if (app) await app.close();
    if (connection) await connection.pool.end();
    await fs.rm(mediaRoot, { recursive: true, force: true });
    try {
      await admin.pool.query(
        'DROP DATABASE IF EXISTS "' + databaseName + '" WITH (FORCE)',
      );
    } finally {
      await admin.pool.end();
    }
  }
  try {
    await admin.pool.query('CREATE DATABASE "' + databaseName + '"');
    connection = createDatabase(url.toString());
    await migrate(connection.db, {
      migrationsFolder: path.resolve(
        __dirname,
        '../../../../packages/database/drizzle',
      ),
    });
    const password = randomBytes(20).toString('base64url');
    const passwordHash = await hashPassword(password);
    const [root, branchAdmin] = await connection.db
      .insert(staffUsers)
      .values([
        {
          username: 'test.super',
          displayName: 'Super Admin (test only)',
          role: 'SUPER_ADMIN',
          passwordHash,
        },
        {
          username: 'test.branch',
          displayName: 'Branch Admin (test only)',
          role: 'BRANCH_ADMIN',
          passwordHash,
        },
      ])
      .returning();
    const baseBranch = {
      isPublished: true,
      nameAr: 'فرع للاختبار فقط',
      addressEn: 'Test-only address',
      addressAr: 'عنوان للاختبار فقط',
      city: 'Test city',
      district: 'Test district',
      country: 'SA',
      phone: '+966 59 771 3349',
      whatsappUrl: 'https://wa.me/966597713349',
      mapsUrl: 'https://goo.gl/maps/mhWvzaZhw956to9o8?g_st=aw',
    };
    const [branchA, branchB] = await connection.db
      .insert(branches)
      .values([
        {
          ...baseBranch,
          nameEn: 'Branch A (test only)',
          slug: 'test-branch-a',
        },
        {
          ...baseBranch,
          nameEn: 'Branch B (test only)',
          slug: 'test-branch-b',
        },
      ])
      .returning();
    await connection.db
      .insert(branchMemberships)
      .values({ userId: branchAdmin.id, branchId: branchA.id });
    const redisUrl = new URL(process.env.REDIS_URL ?? 'redis://localhost:6381');
    redisUrl.pathname = '/15';
    const env = validateEnvironment({
      ...process.env,
      DATABASE_URL: url.toString(),
      REDIS_URL: redisUrl.toString(),
      NODE_ENV: 'test',
      MEDIA_STORAGE_ROOT: mediaRoot,
      MEDIA_QUEUE_NAME: databaseName,
      MEDIA_MAX_UPLOAD_MB: '2',
      MEDIA_QUOTA_MB: '50',
      MEDIA_PROCESS_TIMEOUT_SECONDS: '30',
      CORS_ORIGIN: origin,
    });
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ENVIRONMENT)
      .useValue(env)
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app, env.CORS_ORIGIN);
    await app.init();
    // Ensure Redis is ready before exercising login rate limiting.
    const redis = app.get(RedisService);
    for (let attempt = 0; attempt < 30; attempt++) {
      try {
        await redis.ping();
        break;
      } catch {
        if (attempt === 29) throw new Error('Test Redis unavailable');
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    if (listen) await app.listen(0, '127.0.0.1');
    return {
      app,
      db: connection.db,
      pool: connection.pool,
      root,
      branchAdmin,
      branchA,
      branchB,
      password,
      env,
      eq,
      auth: app.get(AuthService),
      database: app.get(DatabaseService),
      url: listen ? await app.getUrl() : undefined,
      close,
    };
  } catch (error) {
    await close();
    throw error;
  }
}
module.exports = { createHarness, apiRequire };
