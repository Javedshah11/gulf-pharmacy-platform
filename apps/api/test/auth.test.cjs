const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createHarness, apiRequire } = require('./support/harness.cjs');
const { authSessions, staffUsers, adminAuditLogs, eq } =
  apiRequire('@gulf/database');
const { tokenHash } = require('../dist/auth/auth.service');
const { setSessionCookie } = require('../dist/auth/session-cookie');
const origin = 'http://localhost:3000';
const headers = { Origin: origin, 'X-Gulf-Request': 'admin' };
const cookieFrom = (response) =>
  response.headers['set-cookie'][0].split(';')[0];

test('real PostgreSQL/Redis authentication, sessions, roles, CSRF and branch isolation', async (t) => {
  const h = await createHarness();
  const api = request(h.app.getHttpServer());
  const login = async (username, password = h.password, cookie) => {
    let req = api.post('/api/auth/login').set(headers);
    if (cookie) req = req.set('Cookie', cookie);
    return req.send({ username, password });
  };
  try {
    await t.test(
      'public endpoints work; protected endpoints require login; CSRF fails closed',
      async () => {
        await api.get('/api/health').expect(200);
        await api.get('/api/branches').expect(200);
        await api.get('/api/admin/branches').expect(401);
        await api.get('/api/auth/me').expect(401);
        await api
          .post('/api/auth/login')
          .send({ username: h.root.username, password: h.password })
          .expect(403);
        await api
          .post('/api/auth/login')
          .set({ ...headers, Origin: 'https://attacker.example' })
          .send({ username: h.root.username, password: h.password })
          .expect(403);
        await api.post('/api/auth/register').set(headers).send({}).expect(404);
      },
    );
    await t.test(
      'invalid credentials are generic and successful login stores only hashed tokens',
      async () => {
        const missing = await login('test.missing', 'wrong');
        const wrong = await login(h.branchAdmin.username, 'wrong');
        assert.equal(missing.status, 401);
        assert.equal(wrong.status, 401);
        assert.deepEqual(missing.body, wrong.body);
        const result = await login(h.root.username);
        assert.equal(result.status, 200);
        assert.match(result.headers['set-cookie'][0], /HttpOnly/);
        assert.match(result.headers['set-cookie'][0], /SameSite=Strict/);
        assert.match(result.headers['cache-control'], /no-store/);
        const token = cookieFrom(result).split('=')[1];
        const [stored] = await h.db
          .select()
          .from(authSessions)
          .where(eq(authSessions.tokenHash, tokenHash(token)));
        assert.ok(stored);
        assert.notEqual(stored.tokenHash, token);
        assert.equal(result.body.token, undefined);
        assert.equal(result.body.user.passwordHash, undefined);
        h.rootCookie = cookieFrom(result);
      },
    );
    await t.test(
      'Branch A admin cannot read or edit Branch B, manage staff, or escalate privileges',
      async () => {
        const result = await login(h.branchAdmin.username);
        assert.equal(result.status, 200);
        h.branchCookie = cookieFrom(result);
        const list = await api
          .get('/api/admin/branches')
          .set('Cookie', h.branchCookie)
          .expect(200);
        assert.deepEqual(
          list.body.map((row) => row.id),
          [h.branchA.id],
        );
        await api
          .get('/api/admin/branches/' + h.branchB.id)
          .set('Cookie', h.branchCookie)
          .expect(403);
        await api
          .patch('/api/admin/branches/' + h.branchB.id)
          .set(headers)
          .set('Cookie', h.branchCookie)
          .send({ nameEn: 'Unauthorized' })
          .expect(403);
        await api
          .patch('/api/admin/branches/' + h.branchA.id)
          .set(headers)
          .set('Cookie', h.branchCookie)
          .send({ district: 'Updated test district' })
          .expect(200);
        await api
          .patch('/api/admin/branches/' + h.branchA.id)
          .set(headers)
          .set('Cookie', h.branchCookie)
          .send({ isActive: false })
          .expect(400);
        await api
          .patch('/api/admin/branches/' + h.branchA.id)
          .set(headers)
          .set('Cookie', h.branchCookie)
          .send({ nameEn: null })
          .expect(400);
        await api
          .get('/api/admin/users')
          .set('Cookie', h.branchCookie)
          .expect(403);
        await api
          .put('/api/admin/users/' + h.branchAdmin.id + '/memberships')
          .set(headers)
          .set('Cookie', h.branchCookie)
          .send({ branchIds: [h.branchB.id] })
          .expect(403);
      },
    );
    await t.test(
      'Super Admin manages staff and memberships, cannot change protected Super Admin',
      async () => {
        const users = await api
          .get('/api/admin/users')
          .set('Cookie', h.rootCookie)
          .expect(200);
        assert.ok(users.body.every((user) => !('passwordHash' in user)));
        await api
          .patch('/api/admin/users/' + h.root.id)
          .set(headers)
          .set('Cookie', h.rootCookie)
          .send({ isActive: false })
          .expect(403);
        await api
          .post('/api/admin/users')
          .set(headers)
          .set('Cookie', h.rootCookie)
          .send({
            username: 'test.new',
            displayName: 'New (test only)',
            password: h.password,
            branchIds: [h.branchB.id],
            role: 'SUPER_ADMIN',
          })
          .expect(400);
        const created = await api
          .post('/api/admin/users')
          .set(headers)
          .set('Cookie', h.rootCookie)
          .send({
            username: 'test.new',
            displayName: 'New (test only)',
            password: h.password,
            branchIds: [h.branchB.id],
          })
          .expect(201);
        assert.equal(created.body.role, 'BRANCH_ADMIN');
        assert.equal(created.body.passwordHash, undefined);
        const newLogin = await login('test.new');
        const cookie = cookieFrom(newLogin);
        await api
          .patch('/api/admin/users/' + created.body.id)
          .set(headers)
          .set('Cookie', h.rootCookie)
          .send({ isActive: false })
          .expect(200);
        await api.get('/api/auth/me').set('Cookie', cookie).expect(401);
        assert.equal((await login('test.new')).status, 401);
        await api
          .put('/api/admin/users/' + h.branchAdmin.id + '/memberships')
          .set(headers)
          .set('Cookie', h.rootCookie)
          .send({ branchIds: [h.branchB.id] })
          .expect(200);
        await api.get('/api/auth/me').set('Cookie', h.branchCookie).expect(401);
        const relogin = await login(h.branchAdmin.username);
        h.branchCookie = cookieFrom(relogin);
        const list = await api
          .get('/api/admin/branches')
          .set('Cookie', h.branchCookie)
          .expect(200);
        assert.deepEqual(
          list.body.map((row) => row.id),
          [h.branchB.id],
        );
        await api
          .get('/api/admin/branches/' + h.branchA.id)
          .set('Cookie', h.branchCookie)
          .expect(403);
      },
    );
    await t.test(
      'password change rotates current session and revokes all other sessions',
      async () => {
        const other = await login(h.root.username);
        const otherCookie = cookieFrom(other);
        const newPassword = h.password + 'new';
        await api
          .post('/api/auth/change-password')
          .set(headers)
          .set('Cookie', h.rootCookie)
          .send({ currentPassword: 'wrong', newPassword })
          .expect(401);
        const changed = await api
          .post('/api/auth/change-password')
          .set(headers)
          .set('Cookie', h.rootCookie)
          .send({ currentPassword: h.password, newPassword })
          .expect(200);
        await api.get('/api/auth/me').set('Cookie', h.rootCookie).expect(401);
        await api.get('/api/auth/me').set('Cookie', otherCookie).expect(401);
        h.rootCookie = cookieFrom(changed);
        await api.get('/api/auth/me').set('Cookie', h.rootCookie).expect(200);
        const [user] = await h.db
          .select()
          .from(staffUsers)
          .where(eq(staffUsers.id, h.root.id));
        assert.match(user.passwordHash, /^\$argon2id\$/);
        assert.equal((await login(h.root.username, h.password)).status, 401);
        const rotated = await login(h.root.username, newPassword, h.rootCookie);
        assert.equal(rotated.status, 200);
        await api.get('/api/auth/me').set('Cookie', h.rootCookie).expect(401);
        h.rootCookie = cookieFrom(rotated);
      },
    );
    await t.test(
      'expired and revoked sessions fail; logout invalidates replay',
      async () => {
        const token = h.branchCookie.split('=')[1];
        await h.db
          .update(authSessions)
          .set({
            createdAt: new Date(Date.now() - 7200000),
            expiresAt: new Date(Date.now() - 3600000),
          })
          .where(eq(authSessions.tokenHash, tokenHash(token)));
        await api.get('/api/auth/me').set('Cookie', h.branchCookie).expect(401);
        await api
          .post('/api/auth/logout')
          .set(headers)
          .set('Cookie', h.rootCookie)
          .send({})
          .expect(204);
        await api.get('/api/auth/me').set('Cookie', h.rootCookie).expect(401);
      },
    );
    await t.test(
      'Redis rate limiting blocks account and IP attempts and audit logs omit secrets',
      async () => {
        for (let i = 0; i < 5; i++)
          await h.auth.limit('isolated-ip', 'isolated-account');
        await assert.rejects(
          () => h.auth.limit('isolated-ip', 'isolated-account'),
          (error) => error.getStatus() === 429,
        );
        for (let i = 0; i < 30; i++)
          await h.auth.limit('ip-budget', 'account-' + i);
        await assert.rejects(
          () => h.auth.limit('ip-budget', 'different-account'),
          (error) => error.getStatus() === 429,
        );
        const audit = await h.db.select().from(adminAuditLogs);
        assert.ok(audit.some((row) => row.action === 'auth.password_changed'));
        assert.ok(
          audit.some((row) => row.action === 'staff.branches_assigned'),
        );
        assert.ok(!JSON.stringify(audit).includes(h.password));
        assert.ok(!JSON.stringify(audit).includes(h.rootCookie));
      },
    );
    await t.test('production cookies use Secure and __Host prefix', () => {
      let captured;
      setSessionCookie(
        {
          cookie: (name, value, options) => {
            captured = { name, value, options };
          },
        },
        { NODE_ENV: 'production' },
        'opaque',
        new Date(),
      );
      assert.equal(captured.name, '__Host-gulf_session');
      assert.equal(captured.options.secure, true);
      assert.equal(captured.options.httpOnly, true);
      assert.equal(captured.options.sameSite, 'strict');
      assert.equal(captured.options.path, '/');
      assert.equal(captured.options.domain, undefined);
    });
    await t.test(
      'bootstrap CLI is idempotent and never resets an existing Super Admin',
      async () => {
        const { execFile } = require('node:child_process');
        const { promisify } = require('node:util');
        const path = require('node:path');
        const before = await h.db
          .select()
          .from(staffUsers)
          .where(eq(staffUsers.id, h.root.id));
        const result = await promisify(execFile)(
          process.execPath,
          [path.resolve(__dirname, '../dist/cli/bootstrap.js')],
          {
            cwd: path.resolve(__dirname, '..'),
            env: {
              ...process.env,
              DATABASE_URL: h.env.DATABASE_URL,
              NODE_ENV: 'test',
            },
          },
        );
        assert.match(result.stdout, /already exists/);
        assert.ok(!result.stdout.includes(h.password));
        const after = await h.db
          .select()
          .from(staffUsers)
          .where(eq(staffUsers.id, h.root.id));
        assert.deepEqual(after, before);
      },
    );
    await t.test(
      'repeated confirmed-branch seeding preserves administrator profile edits',
      async () => {
        const { createRequire } = require('node:module');
        const { execFile } = require('node:child_process');
        const { promisify } = require('node:util');
        const path = require('node:path');
        const databaseRoot = path.resolve(
          __dirname,
          '../../../packages/database',
        );
        const databaseRequire = createRequire(
          path.join(databaseRoot, 'package.json'),
        );
        const run = () =>
          promisify(execFile)(
            process.execPath,
            [databaseRequire.resolve('tsx/cli'), 'src/seed.ts'],
            {
              cwd: databaseRoot,
              env: { ...process.env, DATABASE_URL: h.env.DATABASE_URL },
            },
          );
        await run();
        const { branches } = apiRequire('@gulf/database');
        await h.db
          .update(branches)
          .set({
            district: 'Administrator edit (test only)',
            isPublished: false,
          })
          .where(eq(branches.slug, 'gulf-pharmacy-dammam'));
        await run();
        const rows = await h.db
          .select()
          .from(branches)
          .where(eq(branches.slug, 'gulf-pharmacy-dammam'));
        assert.equal(rows.length, 1);
        assert.equal(rows[0].district, 'Administrator edit (test only)');
        assert.equal(rows[0].isPublished, false);
      },
    );
  } finally {
    await h.close();
  }
});
