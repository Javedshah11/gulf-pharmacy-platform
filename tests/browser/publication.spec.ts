import {
  test,
  expect,
  request as requestFactory,
  type APIRequestContext,
} from '@playwright/test';
import support from './support/production.cjs';
let h: Awaited<ReturnType<typeof support.productionHarness>>;
let rootClient: APIRequestContext;
let memberClient: APIRequestContext;
test.beforeAll(async () => {
  h = await support.productionHarness();
  rootClient = await requestFactory.newContext();
  memberClient = await requestFactory.newContext();
});
test.afterAll(async () => {
  await rootClient?.dispose();
  await memberClient?.dispose();
  await h?.close();
});
test('branch edits, publication and SEO stay consistent across server-rendered pages', async ({
  page,
  request,
}) => {
  const headers = { Origin: h.baseURL, 'X-Gulf-Request': 'admin' };
  const rootLogin = await rootClient.post(h.url + '/api/auth/login', {
    headers,
    data: { username: h.root.username, password: h.password },
  });
  expect(rootLogin.status()).toBe(200);
  const rootCookie = rootLogin.headers()['set-cookie'].split(';')[0];
  const memberLogin = await memberClient.post(h.url + '/api/auth/login', {
    headers,
    data: { username: h.branchAdmin.username, password: h.password },
  });
  const memberCookie = memberLogin.headers()['set-cookie'].split(';')[0];
  const edit = async (cookie: string, data: object) =>
    request.patch(h.url + '/api/admin/branches/' + h.branchA.id, {
      headers: { ...headers, Cookie: cookie },
      data,
    });
  const path = '/en/branches/' + h.branchA.slug;
  let response = await request.get(h.baseURL + path);
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('https://pharmacy.test' + path);
  expect(html).toMatch(/hreflang="ar"/i);
  expect(html).not.toContain('rel="canonical" href="http://localhost');
  const sitemap = await request.get(h.baseURL + '/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain('https://pharmacy.test' + path);
  expect(
    (
      await edit(memberCookie, {
        descriptionEn:
          'A verified profile edit from the assigned branch administrator.',
      })
    ).status(),
  ).toBe(200);
  response = await request.get(h.baseURL + path);
  expect(await response.text()).toContain(
    'A verified profile edit from the assigned branch administrator.',
  );
  expect((await edit(memberCookie, { isPublished: false })).status()).toBe(403);
  expect((await edit(rootCookie, { isPublished: false })).status()).toBe(200);
  expect((await request.get(h.baseURL + path)).status()).toBe(404);
  expect(
    (await request.get(h.baseURL + '/ar/branches/' + h.branchA.slug)).status(),
  ).toBe(404);
  expect(
    await (await request.get(h.baseURL + '/sitemap.xml')).text(),
  ).not.toContain('/branches/' + h.branchA.slug);
  expect(
    (
      await edit(rootCookie, {
        isPublished: true,
        openingHours: [{ day: 1, opens: '09:00', closes: '18:00' }],
        services: [
          {
            nameEn: 'Documented test service',
            nameAr: 'خدمة موثقة للاختبار فقط',
          },
        ],
      })
    ).status(),
  ).toBe(200);
  await page.goto(h.baseURL + path);
  await expect(
    page.getByText('Documented test service', { exact: true }),
  ).toBeVisible();
  const schema = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ??
      '{}',
  );
  expect(schema.openingHoursSpecification).toHaveLength(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://pharmacy.test' + path,
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    'content',
    'https://pharmacy.test' + path,
  );
  const robots = await request.get(h.baseURL + '/robots.txt');
  expect(await robots.text()).toContain('Disallow: /admin');
  const image = await request.get(h.baseURL + '/share-image');
  expect(image.status()).toBe(200);
  expect(image.headers()['content-type']).toContain('image/png');
  // Authenticate in the real UI, then prove the Super Admin's publication control works.
  await page.route('http://localhost:4000/api/**', async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      response: await route.fetch({
        url: h.url + url.pathname + url.search,
        headers: await route.request().allHeaders(),
      }),
    });
  });
  await page.goto(h.baseURL + '/admin/login');
  await page.getByLabel('Username', { exact: true }).fill(h.root.username);
  await page.getByLabel('Password', { exact: true }).fill(h.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'A clear view of your pharmacy.' }),
  ).toBeVisible();
  await page.goto(h.baseURL + '/admin/branches/' + h.branchA.id);
  await page
    .getByRole('checkbox', {
      name: 'Publish this branch on the public website',
      exact: true,
    })
    .uncheck();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(
    page.getByText('Branch profile saved.', { exact: true }),
  ).toBeVisible();
  expect((await request.get(h.baseURL + path)).status()).toBe(404);
  const database = h.database.db;
  const originalSelect = database.select;
  try {
    database.select = () => {
      throw new Error('Isolated test dependency outage');
    };
    await page.goto(h.baseURL + '/ar');
    await expect(page.locator('.public-state[role="alert"]')).toContainText(
      'تعذر تحميل بيانات الفروع',
    );
  } finally {
    database.select = originalSelect;
  }
  await page
    .getByRole('button', { name: 'إعادة المحاولة', exact: true })
    .click();
  await expect(page.locator('.public-branch-card')).toHaveCount(1);
  await expect(page.locator('.public-state[role="alert"]')).toHaveCount(0);
});
