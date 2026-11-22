const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Test } = require('@nestjs/testing');
const request = require('supertest');
const { AppModule } = require('../dist/app.module');
const { configureApp } = require('../dist/configure-app');
const {
  ENVIRONMENT,
  validateEnvironment,
} = require('../dist/config/environment');
const { DatabaseService } = require('../dist/infrastructure/database.service');
const { RedisService } = require('../dist/infrastructure/redis.service');
const { BranchesRepository } = require('../dist/branches/branches.repository');

test('API HTTP contracts, validation, dependency failures and safe errors', async () => {
  let databaseDown = false;
  let redisDown = false;
  let repositoryDown = false;
  const branch = {
    id: '00000000-0000-4000-8000-000000000001',
    nameEn: 'Gulf Pharmacy',
    nameAr: 'صيدلية الخليج',
    slug: 'gulf-pharmacy-dammam',
    addressEn: 'Street 8, Ar Rabi, Dammam 32241, Saudi Arabia',
    addressAr: 'شارع 8، حي الربيع، الدمام 32241، المملكة العربية السعودية',
    city: 'Dammam',
    district: 'Ar Rabi',
    country: 'SA',
    phone: '+966 59 771 3349',
    whatsappUrl: 'https://wa.me/966597713349',
    mapsUrl: 'https://goo.gl/maps/mhWvzaZhw956to9o8?g_st=aw',
    isActive: true,
    privateField: 'must-not-leak',
  };
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ENVIRONMENT)
    .useValue({})
    .overrideProvider(DatabaseService)
    .useValue({
      ping: async () => {
        if (databaseDown) throw new Error('secret database URL');
      },
    })
    .overrideProvider(RedisService)
    .useValue({
      ping: async () => {
        if (redisDown) throw new Error('secret redis URL');
      },
    })
    .overrideProvider(BranchesRepository)
    .useValue({
      list: async () => {
        if (repositoryDown) throw new Error('secret query');
        return [branch];
      },
      find: async (slug) => (slug === branch.slug ? branch : undefined),
    })
    .compile();
  const app = moduleRef.createNestApplication();
  configureApp(app, 'http://localhost:3000');
  await app.init();
  try {
    const api = request(app.getHttpServer());
    const health = await api.get('/api/health').expect(200);
    assert.equal(health.body.status, 'ok');
    await api.get('/api/health/dependencies').expect(200, {
      status: 'ok',
      dependencies: { database: 'up', redis: 'up' },
    });
    const list = await api
      .get('/api/branches')
      .set('Origin', 'http://localhost:3000')
      .expect('Access-Control-Allow-Origin', 'http://localhost:3000')
      .expect(200);
    assert.equal(list.body.length, 1);
    assert.equal(list.body[0].slug, branch.slug);
    assert.equal(list.body[0].privateField, undefined);
    const detail = await api.get('/api/branches/' + branch.slug).expect(200);
    assert.equal(detail.body.nameAr, branch.nameAr);
    await api.get('/api/branches/missing').expect(404);
    await api.get('/api/branches/INVALID').expect(400);
    databaseDown = true;
    await api.get('/api/health/dependencies').expect(503, {
      status: 'degraded',
      dependencies: { database: 'down', redis: 'up' },
    });
    databaseDown = false;
    redisDown = true;
    await api.get('/api/health/dependencies').expect(503, {
      status: 'degraded',
      dependencies: { database: 'up', redis: 'down' },
    });
    repositoryDown = true;
    await api.get('/api/branches').expect(503, {
      statusCode: 503,
      message: 'Service temporarily unavailable',
    });
  } finally {
    await app.close();
  }
});

test('invalid environment reports field names without credentials', () => {
  assert.throws(
    () =>
      validateEnvironment({
        DATABASE_URL: 'secret',
        REDIS_URL: 'secret',
        PORT: '0',
      }),
    (error) =>
      !error.message.includes('secret') &&
      error.message.includes('DATABASE_URL'),
  );
});
