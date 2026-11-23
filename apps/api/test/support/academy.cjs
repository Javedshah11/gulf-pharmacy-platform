const { setInterval, clearInterval } = require('node:timers');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { promises: fs } = require('node:fs');
const path = require('node:path');
const { apiRequire } = require('./harness.cjs');
const { staffUsers, branchMemberships, healthVideoCategories } =
  apiRequire('@gulf/database');
const { mediaConfig, mediaQueue, createMediaWorker, dispatchPending } =
  apiRequire('@gulf/media');
const { hashPassword } = require('../../dist/auth/password');
async function academyFixture(h) {
  const passwordHash = await hashPassword(h.password);
  const [pharmacist, reviewer, outsider] = await h.db
    .insert(staffUsers)
    .values([
      {
        username: 'test.pharmacist',
        displayName: 'Pharmacist (test fixture)',
        role: 'PHARMACIST',
        passwordHash,
      },
      {
        username: 'test.reviewer',
        displayName: 'Reviewer (test fixture)',
        role: 'MEDICAL_REVIEWER',
        passwordHash,
      },
      {
        username: 'test.outsider',
        displayName: 'Other branch (test fixture)',
        role: 'PHARMACIST',
        passwordHash,
      },
    ])
    .returning();
  await h.db.insert(branchMemberships).values([
    { userId: pharmacist.id, branchId: h.branchA.id },
    { userId: reviewer.id, branchId: h.branchA.id },
    { userId: outsider.id, branchId: h.branchB.id },
  ]);
  const [category] = await h.db
    .insert(healthVideoCategories)
    .values({
      slug: 'deterministic-test',
      titleEn: 'Test category only',
      titleAr: 'تصنيف للاختبار فقط',
    })
    .returning();
  const config = mediaConfig(h.env);
  await fs.mkdir(config.MEDIA_STORAGE_ROOT, { recursive: true });
  const fixturePath = path.join(config.MEDIA_STORAGE_ROOT, 'fixture.mp4');
  await promisify(execFile)(
    config.FFMPEG_PATH,
    [
      '-nostdin',
      '-v',
      'error',
      '-f',
      'lavfi',
      '-i',
      'color=c=teal:s=320x180:r=10',
      '-t',
      '2',
      '-an',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-y',
      fixturePath,
    ],
    { windowsHide: true, timeout: 30000 },
  );
  const bytes = await fs.readFile(fixturePath);
  const queue = mediaQueue(h.env.REDIS_URL, config);
  const worker = createMediaWorker(
    { db: h.db, pool: h.pool },
    h.env.REDIS_URL,
    config,
  );
  worker.on('error', () => undefined);
  await worker.waitUntilReady();
  let pending = Promise.resolve();
  const timer = setInterval(() => {
    pending = pending
      .then(() => dispatchPending({ db: h.db, pool: h.pool }, queue))
      .catch(() => undefined);
  }, 500);
  async function close() {
    clearInterval(timer);
    await pending;
    await worker.close();
    await queue.obliterate({ force: true });
    await queue.close();
  }
  return {
    pharmacist,
    reviewer,
    outsider,
    category,
    bytes,
    config,
    worker,
    queue,
    close,
    body: {
      slug: 'deterministic-test-clip',
      titleEn: 'Deterministic test clip',
      titleAr: 'مقطع اختبار حتمي',
      descriptionEn: 'Synthetic color fixture. No medical advice.',
      descriptionAr: 'مقطع لون اصطناعي للاختبار. لا يتضمن نصيحة طبية.',
      branchId: h.branchA.id,
      categoryId: category.id,
      visibilityScope: 'ALL_BRANCHES',
      contentKind: 'GENERAL_EDUCATION',
      references: [
        {
          sourceTitle: 'Test source only',
          sourceUrl: 'https://example.org/test-source',
        },
      ],
    },
  };
}
async function waitFor(check, expected, timeout = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const value = await check();
    if (value === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Timed out waiting for ' + expected);
}
module.exports = { academyFixture, waitFor };
