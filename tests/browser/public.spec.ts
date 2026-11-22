import { test, expect } from '@playwright/test';
test('public homepage, API data, navigation and Arabic layout', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Here for you. Close to home.' }),
  ).toBeVisible();
  await expect(
    page.getByText('Street 8, Ar Rabi, Dammam 32241, Saudi Arabia'),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Chat on WhatsApp' }),
  ).toHaveAttribute('href', 'https://wa.me/966597713349');
  await expect(
    page.getByRole('link', { name: 'Get directions' }),
  ).toHaveAttribute('href', 'https://goo.gl/maps/mhWvzaZhw956to9o8?g_st=aw');
  await page
    .getByRole('link', { name: 'Find our location & contact details' })
    .click();
  await expect(page).toHaveURL(/#branch$/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'test-results/public-' + info.project.name + '.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Switch to Arabic' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(
    page.getByText('شارع 8، حي الربيع، الدمام 32241، المملكة العربية السعودية'),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      document.fonts.check('16px "Noto Sans Arabic Variable"'),
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test('public API error state offers a working retry', async ({ page }) => {
  await page.route('http://localhost:4000/api/branches/**', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': 'http://localhost:3000' },
      body: '{}',
    }),
  );
  await page.goto('/');
  await expect(page.locator('#branch').getByRole('alert')).toContainText(
    'We couldn’t load our branch details.',
  );
  await page.unroute('http://localhost:4000/api/branches/**');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(
    page.getByText('Street 8, Ar Rabi, Dammam 32241, Saudi Arabia'),
  ).toBeVisible();
});
