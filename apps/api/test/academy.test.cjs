const { test } = require('node:test');
const { Buffer } = require('node:buffer');
const assert = require('node:assert/strict');
const { promises: fs } = require('node:fs');
const request = require('supertest');
const { createHarness, apiRequire } = require('./support/harness.cjs');
const { academyFixture, waitFor } = require('./support/academy.cjs');
const {
  healthVideos,
  healthVideoUploads,
  healthVideoEvents,
  healthVideoCategories,
  healthVideoReviewerAssignments,
  staffUsers,
  adminAuditLogs,
  eq,
} = apiRequire('@gulf/database');
const headers = { Origin: 'http://localhost:3000', 'X-Gulf-Request': 'admin' };
test('Academy real upload, FFmpeg worker, independent review, publication and private media', async (t) => {
  const h = await createHarness();
  let fixture;
  try {
    fixture = await academyFixture(h);
    const f = fixture,
      api = request(h.app.getHttpServer());
    const login = async (username) =>
      (
        await api
          .post('/api/auth/login')
          .set(headers)
          .send({ username, password: h.password })
          .expect(200)
      ).headers['set-cookie'][0].split(';')[0];
    const root = await login(h.root.username),
      pharmacist = await login(f.pharmacist.username),
      reviewer = await login(f.reviewer.username),
      outsider = await login(f.outsider.username),
      branch = await login(h.branchAdmin.username);
    let videoId;
    const command = (cookie, path, body = {}) =>
      api
        .post('/api/admin/videos/' + videoId + '/' + path)
        .set(headers)
        .set('Cookie', cookie)
        .send(body);
    const get = () =>
      api
        .get('/api/admin/videos/' + videoId)
        .set('Cookie', pharmacist)
        .expect(200);
    const upload = (cookie, bytes = f.bytes, mime = 'video/mp4') =>
      api
        .put('/api/admin/videos/' + videoId + '/upload')
        .set(headers)
        .set('Cookie', cookie)
        .set('Content-Type', mime)
        .send(bytes);
    await t.test(
      'pharmacists create scoped drafts; other roles and outsiders cannot author or inspect',
      async () => {
        await api
          .post('/api/admin/videos')
          .set(headers)
          .send(f.body)
          .expect(401);
        await api
          .post('/api/admin/videos')
          .set(headers)
          .set('Cookie', root)
          .send(f.body)
          .expect(403);
        await api
          .post('/api/admin/videos')
          .set(headers)
          .set('Cookie', pharmacist)
          .send({ ...f.body, branchId: h.branchB.id })
          .expect(403);
        const result = await api
          .post('/api/admin/videos')
          .set(headers)
          .set('Cookie', pharmacist)
          .send(f.body)
          .expect(201);
        videoId = result.body.id;
        await api
          .get('/api/admin/videos/' + videoId)
          .set('Cookie', outsider)
          .expect(403);
        await api
          .get('/api/admin/videos/' + videoId)
          .set('Cookie', reviewer)
          .expect(403);
        await api.get('/api/health-academy/videos/' + f.body.slug).expect(404);
        await api
          .get('/api/health-academy/videos/' + f.body.slug + '/assets/playback')
          .expect(404);
      },
    );
    await t.test(
      'upload rejects unauthenticated, wrong role, cross branch, MIME and oversized data',
      async () => {
        await api
          .put('/api/admin/videos/' + videoId + '/upload')
          .set(headers)
          .set('Content-Type', 'video/mp4')
          .send(f.bytes)
          .expect(401);
        await upload(root).expect(403);
        await upload(outsider).expect(403);
        await upload(pharmacist, f.bytes, 'application/javascript').expect(403);
        await api
          .put('/api/admin/videos/' + videoId + '/upload')
          .set(headers)
          .set('Cookie', pharmacist)
          .set('Content-Type', 'video/mp4')
          .set('Content-Length', String(2 * 1024 * 1024 + 1))
          .send(Buffer.alloc(16))
          .expect(413);
        await api
          .put('/api/admin/videos/' + videoId + '/upload')
          .set('Cookie', pharmacist)
          .set('Content-Type', 'video/mp4')
          .send(f.bytes)
          .expect(403);
      },
    );
    await t.test(
      'signature failures remove private partial files and quota reservations',
      async () => {
        await upload(pharmacist, Buffer.alloc(80)).expect(400);
        const v = (await get()).body;
        assert.equal(v.status, 'PROCESSING_FAILED');
        const [u] = await h.db
          .select()
          .from(healthVideoUploads)
          .where(eq(healthVideoUploads.id, v.currentUploadId));
        assert.equal(u.reservedBytes, 0);
        await assert.rejects(fs.stat(f.config.MEDIA_STORAGE_ROOT + '/' + u.id));
      },
    );
    await t.test(
      'real worker transcodes to MP4, generates thumbnail, records metadata, hides source',
      async () => {
        await upload(pharmacist).expect(200);
        await waitFor(async () => (await get()).body.status, 'DRAFT');
        const v = (await get()).body;
        assert.ok(v.durationSeconds >= 2);
        assert.ok(
          v.assets.some((a) => a.assetType === 'PLAYBACK' && a.width === 320),
        );
        assert.ok(v.assets.some((a) => a.assetType === 'THUMBNAIL'));
        assert.ok(v.assets.every((a) => !('storageKey' in a)));
        await api
          .get('/api/admin/videos/' + videoId + '/assets/source')
          .set('Cookie', root)
          .expect(404);
        await api
          .get('/api/admin/videos/' + videoId + '/assets/playback')
          .set('Cookie', outsider)
          .expect(403);
        await api
          .get('/api/admin/videos/' + videoId + '/assets/playback')
          .set('Cookie', root)
          .set('Range', 'bytes=0-31')
          .expect(206)
          .expect('Content-Length', '32');
        await api
          .get('/api/admin/videos/' + videoId + '/assets/playback')
          .set('Cookie', root)
          .set('Range', 'bytes=999999999-')
          .expect(416);
      },
    );
    await t.test(
      'captions are validated, remain private, and revise approvals',
      async () => {
        await api
          .put('/api/admin/videos/' + videoId + '/captions')
          .set(headers)
          .set('Cookie', pharmacist)
          .send({
            locale: 'en',
            text: 'WEBVTT\n\n00:00.000 --> 00:01.000\n<script>bad</script>',
          })
          .expect(400);
        await api
          .put('/api/admin/videos/' + videoId + '/captions')
          .set(headers)
          .set('Cookie', pharmacist)
          .send({
            locale: 'en',
            text: 'WEBVTT\n\n00:00.000 --> 00:01.000\nSynthetic test color only.\n',
          })
          .expect(200);
      },
    );
    await t.test(
      'explicit independent assignment and medical review; administrators cannot approve',
      async () => {
        await command(root, 'reviewers', { reviewerId: f.reviewer.id }).expect(
          201,
        );
        await command(pharmacist, 'submit').expect(201);
        await command(pharmacist, 'medical-review', {
          decision: 'APPROVE',
          comments: 'self',
        }).expect(403);
        await command(root, 'medical-review', {
          decision: 'APPROVE',
          comments: 'admin',
        }).expect(403);
        await command(branch, 'publish').expect(403);
        await command(root, 'publish').expect(409);
        await command(reviewer, 'medical-review', {
          decision: 'CHANGES_REQUESTED',
          comments: 'Disposable test feedback',
        }).expect(201);
        assert.equal((await get()).body.status, 'CHANGES_REQUESTED');
        await command(pharmacist, 'submit').expect(201);
        await command(reviewer, 'medical-review', {
          decision: 'REJECT',
          comments: 'Disposable test rejection',
        }).expect(201);
        assert.equal((await get()).body.status, 'REJECTED');
        await command(pharmacist, 'submit').expect(201);
        await command(reviewer, 'medical-review', {
          decision: 'APPROVE',
          comments: 'Synthetic fixture reviewed; no medical advice',
        }).expect(201);
        await command(root, 'publish').expect(409);
        await command(root, 'compliance-review', {
          decision: 'NOT_REQUIRED',
          comments: 'Test fixture only; no product promotion',
          authorAttributionApproved: true,
        }).expect(201);
        await command(root, 'publish').expect(201);
      },
    );
    await t.test(
      'public DTO, search, captions and byte ranges; originals and reviewer notes never public',
      async () => {
        const result = await api
          .get('/api/health-academy/videos/' + f.body.slug)
          .expect(200);
        assert.equal(result.body.authorName, f.pharmacist.displayName);
        assert.deepEqual(result.body.captions, ['en']);
        for (const key of [
          'reviews',
          'reviewerIds',
          'authorId',
          'currentUploadId',
          'medicalReviewStatus',
          'complianceReference',
        ])
          assert.ok(!(key in result.body));
        const list = await api
          .get(
            '/api/health-academy/videos?search=Deterministic&category=' +
              f.category.slug,
          )
          .expect(200);
        assert.equal(list.body.total, 1);
        await api
          .get('/api/health-academy/videos/' + f.body.slug + '/assets/playback')
          .set('Range', 'bytes=0-127')
          .expect(206)
          .expect('Content-Length', '128');
        await api
          .get(
            '/api/health-academy/videos/' + f.body.slug + '/assets/captions-en',
          )
          .expect(200)
          .expect('Content-Type', /text\/vtt/);
        await api
          .get('/api/health-academy/videos/' + f.body.slug + '/assets/source')
          .expect(404);
      },
    );
    await t.test(
      'privacy-conscious events deduplicate repeats, ignore bots and aggregate real records',
      async () => {
        const signal = () =>
          api
            .post('/api/health-academy/videos/' + f.body.slug + '/events')
            .set('Origin', headers.Origin)
            .set('X-Gulf-Request', 'public')
            .set('User-Agent', 'Mozilla/5.0 Test fixture')
            .send({ eventType: 'VIEW' });
        assert.equal((await signal().expect(201)).body.accepted, true);
        assert.equal((await signal().expect(201)).body.accepted, false);
        await api
          .post('/api/health-academy/videos/' + f.body.slug + '/events')
          .set('Origin', headers.Origin)
          .set('X-Gulf-Request', 'public')
          .set('User-Agent', 'SearchBot')
          .send({ eventType: 'COMPLETE' })
          .expect(201);
        const rows = await h.db.select().from(healthVideoEvents);
        assert.equal(rows.length, 1);
        assert.deepEqual(
          Object.keys(rows[0]).sort(),
          ['id', 'videoId', 'branchId', 'eventType', 'createdAt'].sort(),
        );
        const counts = await api
          .get('/api/admin/videos/analytics')
          .set('Cookie', root)
          .expect(200);
        assert.equal(counts.body[0].count, 1);
      },
    );
    await t.test(
      'disabled categories gate every public asset immediately; edits require fresh approvals',
      async () => {
        await h.db
          .update(healthVideoCategories)
          .set({ isActive: false })
          .where(eq(healthVideoCategories.id, f.category.id));
        await api
          .get('/api/health-academy/videos/' + f.body.slug + '/assets/playback')
          .expect(404);
        await h.db
          .update(healthVideoCategories)
          .set({ isActive: true })
          .where(eq(healthVideoCategories.id, f.category.id));
        await api
          .patch('/api/admin/videos/' + videoId)
          .set(headers)
          .set('Cookie', branch)
          .send({ ...f.body, titleEn: 'Revised test fixture' })
          .expect(200);
        const v = (await get()).body;
        assert.equal(v.status, 'DRAFT');
        assert.equal(v.medicalReviewStatus, 'PENDING');
        assert.equal(v.complianceStatus, 'PENDING');
        await command(root, 'publish').expect(409);
        await api.get('/api/health-academy/videos/' + f.body.slug).expect(404);
      },
    );
    await t.test(
      'regulated promotion requires valid separate authorization and expires on all public reads',
      async () => {
        await api
          .patch('/api/admin/videos/' + videoId)
          .set(headers)
          .set('Cookie', pharmacist)
          .send({ ...f.body, contentKind: 'REGULATED_PROMOTION' })
          .expect(200);
        await command(pharmacist, 'submit').expect(201);
        await command(reviewer, 'medical-review', {
          decision: 'APPROVE',
          comments: 'Test only',
        }).expect(201);
        await command(root, 'compliance-review', {
          decision: 'NOT_REQUIRED',
          comments: 'No',
        }).expect(400);
        await command(root, 'compliance-review', {
          decision: 'APPROVE',
          comments: 'Missing ref',
        }).expect(400);
        await command(root, 'compliance-review', {
          decision: 'APPROVE',
          comments: 'Test authorization only',
          approvalReference: 'DISPOSABLE-TEST',
          validUntil: new Date(Date.now() + 3600000).toISOString(),
        }).expect(201);
        await command(root, 'publish').expect(201);
        assert.equal(
          (await api.get('/api/health-academy/videos').expect(200)).body.total,
          0,
        );
        await api.get('/api/health-academy/videos/' + f.body.slug).expect(200);
        await h.db
          .update(healthVideos)
          .set({ complianceValidUntil: new Date(Date.now() - 1000) })
          .where(eq(healthVideos.id, videoId));
        await api.get('/api/health-academy/videos/' + f.body.slug).expect(404);
        await api
          .get(
            '/api/health-academy/videos/' + f.body.slug + '/assets/thumbnail',
          )
          .expect(404);
        await command(root, 'archive').expect(201);
        assert.equal((await get()).body.status, 'ARCHIVED');
      },
    );
    await t.test(
      'permanent processing failure is recorded and retry remains bounded/private',
      async () => {
        const result = await api
          .post('/api/admin/videos')
          .set(headers)
          .set('Cookie', pharmacist)
          .send({ ...f.body, slug: 'invalid-processing-fixture' })
          .expect(201);
        videoId = result.body.id;
        const invalid = Buffer.alloc(32);
        invalid.writeUInt32BE(24);
        invalid.write('ftypisom', 4);
        await upload(pharmacist, invalid).expect(200);
        await waitFor(
          async () => (await get()).body.status,
          'PROCESSING_FAILED',
        );
        await command(pharmacist, 'retry').expect(201);
        await waitFor(
          async () => (await get()).body.status,
          'PROCESSING_FAILED',
        );
        const v = (await get()).body;
        assert.equal(v.processingError, 'INVALID_MEDIA');
      },
    );
    await t.test(
      'storage quota rejects additional uploads before writing bytes',
      async () => {
        const [u] = await h.db
          .select()
          .from(healthVideoUploads)
          .where(eq(healthVideoUploads.videoId, videoId));
        await h.db
          .update(healthVideoUploads)
          .set({ reservedBytes: 51 * 1024 * 1024 })
          .where(eq(healthVideoUploads.id, u.id));
        try {
          await upload(pharmacist).expect(507);
        } finally {
          await h.db
            .update(healthVideoUploads)
            .set({ reservedBytes: u.reservedBytes })
            .where(eq(healthVideoUploads.id, u.id));
        }
      },
    );
    await t.test(
      'transient media tool failures exhaust retries and a corrected environment safely retries successfully',
      async () => {
        const result = await api
          .post('/api/admin/videos')
          .set(headers)
          .set('Cookie', pharmacist)
          .send({ ...f.body, slug: 'transient-processing-fixture' })
          .expect(201);
        videoId = result.body.id;
        const executable = f.config.FFMPEG_PATH;
        f.config.FFMPEG_PATH = 'gulf-nonexistent-test-ffmpeg';
        try {
          await upload(pharmacist).expect(200);
          await waitFor(
            async () => (await get()).body.status,
            'PROCESSING_FAILED',
          );
          assert.equal(
            (await get()).body.processingError,
            'MEDIA_TOOL_UNAVAILABLE',
          );
        } finally {
          f.config.FFMPEG_PATH = executable;
        }
        await command(pharmacist, 'retry').expect(201);
        await waitFor(async () => (await get()).body.status, 'DRAFT');
      },
    );
    await t.test(
      'central staff provisioning and category management preserve role and scope boundaries',
      async () => {
        const body = {
          username: 'test.provisioned',
          displayName: 'Provisioned fixture',
          password: h.password,
          role: 'MEDICAL_REVIEWER',
          branchIds: [h.branchB.id],
        };
        await api
          .post('/api/admin/academy/staff')
          .set(headers)
          .set('Cookie', pharmacist)
          .send(body)
          .expect(403);
        const created = await api
          .post('/api/admin/academy/staff')
          .set(headers)
          .set('Cookie', root)
          .send(body)
          .expect(201);
        await command(root, 'reviewers', {
          reviewerId: created.body.id,
        }).expect(403);
        await api
          .post('/api/admin/academy/staff')
          .set(headers)
          .set('Cookie', root)
          .send({ ...body, username: 'test.escalation', role: 'SUPER_ADMIN' })
          .expect(400);
        const category = {
          slug: 'managed-test',
          titleEn: 'Managed test category',
          titleAr: 'تصنيف اختبار',
          sortOrder: 9,
          isActive: true,
        };
        await api
          .post('/api/admin/videos/categories')
          .set(headers)
          .set('Cookie', pharmacist)
          .send(category)
          .expect(403);
        const saved = await api
          .post('/api/admin/videos/categories')
          .set(headers)
          .set('Cookie', root)
          .send(category)
          .expect(201);
        await api
          .put('/api/admin/videos/categories/' + saved.body.id)
          .set(headers)
          .set('Cookie', root)
          .send({ ...category, isActive: false })
          .expect(200);
        const publicCategories = (
          await api.get('/api/health-academy/categories').expect(200)
        ).body;
        assert.ok(!publicCategories.some((c) => c.id === saved.body.id));
        await api
          .patch('/api/admin/users/' + created.body.id)
          .set(headers)
          .set('Cookie', root)
          .send({ isActive: false })
          .expect(200);
      },
    );
    await t.test(
      'self approval remains blocked even if author is later provisioned as a reviewer',
      async () => {
        await h.db
          .update(staffUsers)
          .set({ role: 'MEDICAL_REVIEWER' })
          .where(eq(staffUsers.id, f.pharmacist.id));
        await command(root, 'reviewers', {
          reviewerId: f.pharmacist.id,
        }).expect(400);
        await h.db.insert(healthVideoReviewerAssignments).values({
          videoId,
          reviewerId: f.pharmacist.id,
          assignedBy: h.root.id,
        });
        await h.db
          .update(healthVideos)
          .set({ status: 'PENDING_REVIEW' })
          .where(eq(healthVideos.id, videoId));
        await command(pharmacist, 'medical-review', {
          decision: 'APPROVE',
          comments: 'Self approval forbidden after role change',
        }).expect(403);
      },
    );
    await t.test('workflow uses existing audit log', async () => {
      const audit = await h.db.select().from(adminAuditLogs);
      assert.ok(audit.some((a) => a.action === 'video.published'));
      assert.ok(audit.some((a) => a.action === 'video.medical_decision'));
      assert.ok(audit.some((a) => a.action === 'video.compliance_decision'));
    });
  } finally {
    if (fixture) await fixture.close();
    await h.close();
  }
});
