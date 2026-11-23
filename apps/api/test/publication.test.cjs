const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createHarness, apiRequire } = require('./support/harness.cjs');
const { branches, adminAuditLogs, eq } = apiRequire('@gulf/database');
const headers = { Origin: 'http://localhost:3000', 'X-Gulf-Request': 'admin' };
test('published business profiles, search, editorial permissions and multi-branch scale', async (t) => {
  const h = await createHarness();
  const api = request(h.app.getHttpServer());
  const login = async (username) => {
    const result = await api
      .post('/api/auth/login')
      .set(headers)
      .send({ username, password: h.password })
      .expect(200);
    return result.headers['set-cookie'][0].split(';')[0];
  };
  try {
    const root = await login(h.root.username);
    const member = await login(h.branchAdmin.username);
    await t.test(
      'public queries exclude draft and inactive branches and project only business fields',
      async () => {
        await h.db.insert(branches).values([
          {
            ...h.branchB,
            id: undefined,
            slug: 'draft-test-only',
            nameEn: 'Unpublished test fixture',
            isPublished: false,
          },
          {
            ...h.branchB,
            id: undefined,
            slug: 'inactive-test-only',
            isActive: false,
          },
        ]);
        const list = await api
          .get('/api/branches')
          .expect('Cache-Control', 'no-store')
          .expect(200);
        assert.equal(list.body.length, 2);
        assert.ok(list.body.every((row) => row.isPublished && row.isActive));
        for (const field of [
          'passwordHash',
          'tokenHash',
          'userId',
          'actorId',
          'createdAt',
          'updatedAt',
        ])
          assert.ok(!(field in list.body[0]));
        assert.deepEqual(list.body[0].openingHours, []);
        assert.deepEqual(list.body[0].services, []);
        await api.get('/api/branches/draft-test-only').expect(404);
        await api.get('/api/branches/inactive-test-only').expect(404);
        const found = await api
          .get('/api/branches')
          .query({ q: 'Branch A' })
          .expect(200);
        assert.deepEqual(
          found.body.map((branch) => branch.id),
          [h.branchA.id],
        );
        assert.equal(
          (await api.get('/api/branches').query({ q: 'عنوان' }).expect(200))
            .body.length,
          2,
        );
        assert.equal(
          (await api.get('/api/branches').query({ q: '%' }).expect(200)).body
            .length,
          0,
        );
        await api
          .get('/api/branches')
          .query({ q: 'x'.repeat(101) })
          .expect(400);
      },
    );
    await t.test(
      'assigned editors can update profile text but cannot publish or approve hours/services',
      async () => {
        const previous = (await api.get('/api/branches/' + h.branchA.slug)).body
          .publicUpdatedAt;
        await api
          .patch('/api/admin/branches/' + h.branchA.id)
          .set(headers)
          .set('Cookie', member)
          .send({
            descriptionEn: 'Verified test description\nSecond paragraph.',
            descriptionAr: 'وصف مؤكد للاختبار فقط',
            contactNameEn: 'Test contact only',
          })
          .expect(200);
        const visible = await api
          .get('/api/branches/' + h.branchA.slug)
          .expect(200);
        assert.match(visible.body.descriptionEn, /Second paragraph/);
        assert.notEqual(visible.body.publicUpdatedAt, previous);
        await api
          .patch('/api/admin/branches/' + h.branchB.id)
          .set(headers)
          .set('Cookie', member)
          .send({ descriptionEn: 'Forbidden' })
          .expect(403);
        for (const body of [
          { isPublished: false },
          { openingHours: [] },
          { services: [] },
        ])
          await api
            .patch('/api/admin/branches/' + h.branchA.id)
            .set(headers)
            .set('Cookie', member)
            .send(body)
            .expect(403);
        await api
          .patch('/api/admin/branches/' + h.branchA.id)
          .set(headers)
          .send({ descriptionEn: 'Forbidden' })
          .expect(401);
      },
    );
    await t.test(
      'Super Admin approves structured content with validation and transactional audit',
      async () => {
        const hours = [{ day: 1, opens: '09:00', closes: '18:00' }];
        const services = [
          {
            nameEn: 'Approved test service',
            nameAr: 'خدمة معتمدة للاختبار فقط',
          },
        ];
        await api
          .patch('/api/admin/branches/' + h.branchA.id)
          .set(headers)
          .set('Cookie', root)
          .send({ openingHours: hours, services })
          .expect(200);
        const visible = await api
          .get('/api/branches/' + h.branchA.slug)
          .expect(200);
        assert.deepEqual(visible.body.openingHours, hours);
        assert.deepEqual(visible.body.services, services);
        for (const body of [
          { openingHours: [hours[0], hours[0]] },
          { openingHours: [{ day: 8, opens: '25:00', closes: '18:00' }] },
          { services: [{ nameEn: 'No Arabic' }] },
          { services: null },
          { publicUpdatedAt: new Date().toISOString() },
        ])
          await api
            .patch('/api/admin/branches/' + h.branchA.id)
            .set(headers)
            .set('Cookie', root)
            .send(body)
            .expect(400);
        await api
          .patch('/api/admin/branches/' + h.branchA.id)
          .set(headers)
          .set('Cookie', root)
          .send({ isPublished: false })
          .expect(200);
        await api.get('/api/branches/' + h.branchA.slug).expect(404);
        assert.ok(
          !(await api.get('/api/branches')).body.some(
            (branch) => branch.id === h.branchA.id,
          ),
        );
        await api
          .get('/api/admin/branches/' + h.branchA.id)
          .set('Cookie', member)
          .expect(200);
        await api
          .patch('/api/admin/branches/' + h.branchA.id)
          .set(headers)
          .set('Cookie', root)
          .send({ isPublished: true })
          .expect(200);
        await api.get('/api/branches/' + h.branchA.slug).expect(200);
        const logs = await h.db
          .select()
          .from(adminAuditLogs)
          .where(eq(adminAuditLogs.targetId, h.branchA.id));
        assert.ok(
          logs.some((log) => log.details.fields?.includes('isPublished')),
        );
      },
    );
    await t.test(
      'the same endpoint supports more than ten published branches without changing live data',
      async () => {
        await h.db.insert(branches).values(
          Array.from({ length: 10 }, (_, index) => ({
            ...h.branchB,
            id: undefined,
            slug: 'scale-test-' + index,
            nameEn: 'Scale test branch ' + index,
          })),
        );
        const list = await api.get('/api/branches').expect(200);
        assert.equal(list.body.length, 12);
      },
    );
  } finally {
    await h.close();
  }
});
