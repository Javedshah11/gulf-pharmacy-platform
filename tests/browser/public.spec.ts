import { test, expect } from '@playwright/test';
test('localized homepages, verified contacts, search and branch pages', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/');
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Care starts with',
  );
  const card = page.locator('.public-branch-card').first();
  await expect(card).toContainText(
    'Street 8, Ar Rabi, Dammam 32241, Saudi Arabia',
  );
  await expect(
    card.getByRole('link', { name: 'Chat on WhatsApp' }),
  ).toHaveAttribute('href', 'https://wa.me/966597713349');
  await expect(
    card.getByRole('link', { name: 'Get directions' }),
  ).toHaveAttribute('href', 'https://goo.gl/maps/mhWvzaZhw956to9o8?g_st=aw');
  await expect(card.locator('.public-phone')).toHaveAttribute(
    'href',
    'tel:+966597713349',
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'test-results/phase3-home-' + info.project.name + '.png',
    fullPage: true,
  });
  await page
    .getByRole('link', { name: 'Switch to Arabic', exact: true })
    .click();
  await expect(page).toHaveURL(/\/ar$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('.public-branch-card').first()).toContainText(
    'شارع 8، حي الربيع، الدمام 32241، المملكة العربية السعودية',
  );
  expect(
    await page.evaluate(() =>
      document.fonts.check('16px "Noto Sans Arabic Variable"'),
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'test-results/phase3-arabic-' + info.project.name + '.png',
    fullPage: true,
  });
  await page
    .locator('header')
    .getByRole('link', { name: 'فروعنا', exact: true })
    .click();
  await expect(page).toHaveURL(/\/ar\/branches$/);
  await page
    .getByRole('link', { name: 'التبديل إلى الإنجليزية', exact: true })
    .click();
  await expect(page).toHaveURL(/\/en\/branches$/);
  await page.getByRole('searchbox', { name: 'Search branches' }).fill('Dammam');
  await page
    .getByRole('button', { name: 'Find a branch', exact: true })
    .click();
  await expect(page.locator('.public-branch-card')).toHaveCount(1);
  await page
    .getByRole('searchbox', { name: 'Search branches' })
    .fill('no-such-branch');
  await page
    .getByRole('button', { name: 'Find a branch', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'No matching branches' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Clear search', exact: true }).click();
  await page.getByRole('link', { name: 'Branch details', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/branches\/gulf-pharmacy-dammam$/);
  await expect(
    page.getByText('Dr. Fahad Badshah', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Please contact the branch to confirm opening hours.', {
      exact: true,
    }),
  ).toBeVisible();
  const data = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ??
      '{}',
  );
  expect(data['@type']).toBe('Pharmacy');
  expect(data.telephone).toBe('+966597713349');
  expect(data).not.toHaveProperty('openingHoursSpecification');
  await page
    .getByRole('link', { name: 'Switch to Arabic', exact: true })
    .click();
  await expect(page).toHaveURL(/\/ar\/branches\/gulf-pharmacy-dammam$/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test('SSR language, invalid routes and private indexing policy', async ({
  request,
}, info) => {
  const ar = await request.get('/ar');
  expect(ar.status()).toBe(200);
  const html = await ar.text();
  expect(html).toMatch(/<html[^>]*lang="ar"[^>]*dir="rtl"/);
  expect(html).toContain('صحتكم. أولويتنا.');
  if (info.project.name === 'desktop')
    for (const locale of ['en', 'ar'])
      for (const path of [
        '/branches',
        '/about',
        '/contact',
        '/privacy',
        '/terms',
      ])
        expect((await request.get('/' + locale + path)).status()).toBe(200);
  for (const path of [
    '/fr',
    '/en/branches/not-a-real-branch',
    '/ar/branches/not-a-real-branch',
    '/en/branches/INVALID',
  ])
    expect((await request.get(path)).status()).toBe(404);
  const login = await request.get('/admin/login');
  expect(await login.text()).toContain('noindex');
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain('Disallow: /');
});
test('contact actions open the exact supplied external destinations', async ({
  page,
  context,
}) => {
  await context.route('https://wa.me/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<title>External destination test</title>',
    }),
  );
  await context.route('https://goo.gl/maps/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<title>External destination test</title>',
    }),
  );
  await page.goto('/en/branches/gulf-pharmacy-dammam');
  for (const action of [
    { name: 'Chat on WhatsApp', url: 'https://wa.me/966597713349' },
    {
      name: 'Get directions',
      url: 'https://goo.gl/maps/mhWvzaZhw956to9o8?g_st=aw',
    },
  ]) {
    const opened = page.waitForEvent('popup');
    await page
      .locator('.public-profile-contact')
      .getByRole('link', { name: action.name, exact: true })
      .click();
    const popup = await opened;
    await expect(popup).toHaveURL(action.url);
    await popup.close();
  }
});
