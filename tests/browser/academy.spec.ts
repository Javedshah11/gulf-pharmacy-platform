import { test, expect, request as requestFactory } from '@playwright/test';
import support from './support/production.cjs';
import academySupport from '../../apps/api/test/support/academy.cjs';
let h: Awaited<ReturnType<typeof support.productionHarness>>;
let f: Awaited<ReturnType<typeof academySupport.academyFixture>>;
test.beforeAll(async () => {
  h = await support.productionHarness();
  f = await academySupport.academyFixture(h);
});
test.afterAll(async () => {
  await f?.close();
  await h?.close();
});
test('real pharmacist UI upload, reviewer and compliance decisions, bilingual responsive playback and archive', async ({
  page,
  context,
  request,
}, info) => {
  test.setTimeout(120000);
  await page.route('http://localhost:4000/api/**', async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      response: await route.fetch({
        url: h.url + url.pathname + url.search,
        headers: await route.request().allHeaders(),
      }),
    });
  });
  const login = async (username: string) => {
    await context.clearCookies();
    await page.goto(h.baseURL + '/admin/login');
    await page.getByLabel('Username', { exact: true }).fill(username);
    await page.getByLabel('Password', { exact: true }).fill(h.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).not.toHaveURL(/\/admin\/login$/);
  };
  await login(f.pharmacist.username);
  await expect(
    page.getByRole('heading', { name: 'Video workspace', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Create video', exact: true }).click();
  await page.getByLabel('English title', { exact: true }).fill(f.body.titleEn);
  await page.getByLabel('Arabic title', { exact: true }).fill(f.body.titleAr);
  await page.getByLabel('URL slug', { exact: true }).fill(f.body.slug);
  await page
    .getByLabel('Category', { exact: true })
    .selectOption(f.category.id);
  await page
    .getByLabel('Source branch', { exact: true })
    .selectOption(h.branchA.id);
  await page
    .getByLabel('English description', { exact: true })
    .fill(f.body.descriptionEn);
  await page
    .getByLabel('Arabic description', { exact: true })
    .fill(f.body.descriptionAr);
  await page
    .getByLabel(
      'References — one per line: source title | https://source-url',
      { exact: true },
    )
    .fill('Test source only | https://example.org/test-source');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/videos\/[a-f0-9-]{36}$/);
  const id = page.url().split('/').pop()!;
  await page
    .getByLabel('Upload MP4 or MOV video', { exact: true })
    .setInputFiles({
      name: 'synthetic-test.mp4',
      mimeType: 'video/mp4',
      buffer: f.bytes,
    });
  await expect(page.locator('.video-private-preview')).toBeVisible({
    timeout: 45000,
  });
  await page
    .getByLabel('English captions (.vtt)', { exact: true })
    .setInputFiles({
      name: 'test.vtt',
      mimeType: 'text/vtt',
      buffer: Buffer.from(
        'WEBVTT\n\n00:00.000 --> 00:01.000\nSynthetic test color only.\n',
      ),
    });
  await expect(
    page.getByRole('button', { name: 'Submit for review', exact: true }),
  ).toBeEnabled();
  const client = await requestFactory.newContext();
  const headers = { Origin: h.baseURL, 'X-Gulf-Request': 'admin' };
  const rootLogin = await client.post(h.url + '/api/auth/login', {
    headers,
    data: { username: h.root.username, password: h.password },
  });
  expect(rootLogin.status()).toBe(200);
  const rootCookie = rootLogin.headers()['set-cookie'].split(';')[0];
  const command = async (path: string, data: object = {}) =>
    request.post(h.url + '/api/admin/videos/' + id + '/' + path, {
      headers: { ...headers, Cookie: rootCookie },
      data,
    });
  expect(
    (await command('reviewers', { reviewerId: f.reviewer.id })).status(),
  ).toBe(201);
  await page
    .getByRole('button', { name: 'Submit for review', exact: true })
    .click();
  await expect(page.locator('.admin-page-title')).toContainText(
    'PENDING_REVIEW',
  );
  expect(
    (
      await request.get(h.baseURL + '/en/health-academy/' + f.body.slug)
    ).status(),
  ).toBe(404);
  await login(f.reviewer.username);
  await page.getByRole('link', { name: f.body.titleEn, exact: true }).click();
  await page
    .getByLabel('Review notes (required)', { exact: true })
    .fill('Synthetic fixture reviewed; no medical advice.');
  await page
    .getByRole('button', { name: 'Record decision', exact: true })
    .click();
  await expect(page.locator('.admin-page-title')).toContainText('APPROVED');
  await login(h.root.username);
  await page.goto(h.baseURL + '/admin/videos/' + id);
  await page
    .getByLabel('Decision', { exact: true })
    .selectOption('NOT_REQUIRED');
  await page
    .getByLabel('Review notes (required)', { exact: true })
    .fill('Disposable test clip only. No regulated promotion.');
  await page
    .getByRole('button', { name: 'Record decision', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText('Saved.');
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.locator('.admin-page-title')).toContainText('PUBLISHED');
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 820, height: 1180 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const locale of ['en', 'ar']) {
      await page.goto(h.baseURL + '/' + locale + '/health-academy');
      await expect(page.locator('.academy-card')).toHaveCount(1);
      await expect(page.locator('html')).toHaveAttribute(
        'dir',
        locale === 'ar' ? 'rtl' : 'ltr',
      );
      await page.locator('.academy-card h2 a').click();
      await expect(
        page.getByRole('heading', {
          name: locale === 'ar' ? f.body.titleAr : f.body.titleEn,
          exact: true,
        }),
      ).toBeVisible();
      await expect
        .poll(() =>
          page
            .locator('video')
            .evaluate((v) => (v as HTMLVideoElement).readyState),
        )
        .toBeGreaterThanOrEqual(1);
      await page.locator('video').evaluate(async (element) => {
        const video = element as HTMLVideoElement;
        await video.play();
        video.pause();
      });
      await expect
        .poll(() =>
          page
            .locator('video')
            .evaluate((element) => (element as HTMLVideoElement).readyState),
        )
        .toBeGreaterThanOrEqual(2);
      const schema = JSON.parse(
        (await page
          .locator('script[type="application/ld+json"]')
          .textContent()) ?? '{}',
      );
      expect(schema['@type']).toBe('VideoObject');
      expect(schema.duration).toBe('PT2S');
      expect(schema.contentUrl).toContain(
        'https://pharmacy.test/media/health-academy/',
      );
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        'https://pharmacy.test/' + locale + '/health-academy/' + f.body.slug,
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath(
          'academy-' + locale + '-' + viewport.width + '.png',
        ),
        fullPage: true,
      });
    }
  }
  await page.locator('video').evaluate((v) => (v as HTMLVideoElement).play());
  await expect
    .poll(() =>
      page.locator('video').evaluate((v) => (v as HTMLVideoElement).ended),
    )
    .toBe(true);
  const sitemap = await request.get(h.baseURL + '/sitemap.xml');
  expect(await sitemap.text()).toContain('/health-academy/' + f.body.slug);
  const bytes = await request.get(
    h.baseURL + '/media/health-academy/' + f.body.slug + '/playback',
    { headers: { Range: 'bytes=0-63' } },
  );
  expect(bytes.status()).toBe(206);
  expect((await bytes.body()).length).toBe(64);
  expect(
    (
      await request.get(
        h.baseURL + '/media/health-academy/' + f.body.slug + '/source',
      )
    ).status(),
  ).toBe(404);
  expect((await command('archive')).status()).toBe(201);
  expect(
    (
      await request.get(h.baseURL + '/en/health-academy/' + f.body.slug)
    ).status(),
  ).toBe(404);
  expect(
    (
      await request.get(
        h.baseURL + '/media/health-academy/' + f.body.slug + '/playback',
      )
    ).status(),
  ).toBe(404);
  await client.dispose();
});
