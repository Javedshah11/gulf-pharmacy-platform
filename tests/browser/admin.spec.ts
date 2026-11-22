import { test, expect } from '@playwright/test';
import harness from '../../apps/api/test/support/harness.cjs';
import { createHash } from 'node:crypto';
let workspace: Awaited<ReturnType<typeof harness.createHarness>>;
test.beforeAll(async () => {
  workspace = await harness.createHarness({ listen: true });
});
test.afterAll(async () => {
  await workspace?.close();
});
test('staff sign-in, protected navigation, account management and logout', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      !(
        message.location().url.includes('/api/auth/me') &&
        message.text().includes('401')
      )
    )
      errors.push(message.text());
  });
  // Route the real frontend client to a real isolated NestJS server. No login responses are mocked.
  await page.route('http://localhost:4000/api/**', async (route) => {
    const url = new URL(route.request().url());
    const response = await route.fetch({
      url: workspace.url + url.pathname + url.search,
      headers: await route.request().allHeaders(),
    });
    await route.fulfill({ response });
  });
  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page
    .getByLabel('Username', { exact: true })
    .fill(workspace.root.username);
  await page.getByLabel('Password', { exact: true }).fill(workspace.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await expect(
    page.getByRole('heading', { name: 'A clear view of your pharmacy.' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Branch A (test only)' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Branch B (test only)' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'test-results/admin-' + info.project.name + '.png',
    fullPage: true,
  });
  const cookies = await page.context().cookies();
  const session = cookies.find((cookie) => cookie.name === 'gulf_session');
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe('Strict');
  expect(await page.evaluate(() => Object.keys(localStorage).length)).toBe(0);
  await page.getByRole('link', { name: 'Staff & access', exact: true }).click();
  await page
    .getByLabel('Full name', { exact: true })
    .fill('Browser Staff (test only)');
  await page.getByLabel('Username', { exact: true }).fill('test.browser');
  await page
    .getByLabel('Initial password · 15–128 characters', { exact: true })
    .fill(workspace.password);
  const createForm = page.locator('form').filter({
    has: page.getByRole('button', {
      name: 'Create Branch Admin',
      exact: true,
    }),
  });
  await createForm
    .getByRole('checkbox', { name: 'Branch A (test only)' })
    .check();
  await page
    .getByRole('button', { name: 'Create Branch Admin', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Browser Staff (test only)' }),
  ).toBeVisible();
  const person = page.locator('article').filter({
    has: page.getByRole('heading', { name: 'Browser Staff (test only)' }),
  });
  await person.getByRole('checkbox', { name: 'Branch B (test only)' }).check();
  await person
    .getByRole('button', { name: 'Update branch access', exact: true })
    .click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(
    page.getByText('Staff access updated.', { exact: true }),
  ).toBeVisible();
  await person
    .getByRole('button', { name: 'Disable account', exact: true })
    .click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(
    person.getByRole('button', { name: 'Enable account', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'العربية', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page
    .getByLabel('Username', { exact: true })
    .fill(workspace.branchAdmin.username);
  await page.getByLabel('Password', { exact: true }).fill(workspace.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Branch A (test only)' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Branch B (test only)' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'Staff & access', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('link', { name: /Branch A \(test only\)/ }).click();
  await page
    .getByLabel('District', { exact: true })
    .fill('Browser test district');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(
    page.getByText('Branch profile saved.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'My settings', exact: true }).click();
  await page
    .getByLabel('Current password', { exact: true })
    .fill(workspace.password);
  await page
    .getByLabel('New password', { exact: true })
    .fill(workspace.password + 'new');
  await page
    .getByLabel('Confirm new password', { exact: true })
    .fill(workspace.password + 'new');
  await page
    .getByRole('button', { name: 'Change password', exact: true })
    .click();
  await expect(
    page.getByText('Password changed. Your other sessions were revoked.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  expect(errors).toEqual([]);
});
test('expired server session returns the user to sign-in', async ({ page }) => {
  await page.route('http://localhost:4000/api/**', async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      response: await route.fetch({
        url: workspace.url + url.pathname + url.search,
        headers: await route.request().allHeaders(),
      }),
    });
  });
  await page.goto('/admin/login');
  await page
    .getByLabel('Username', { exact: true })
    .fill(workspace.root.username);
  await page.getByLabel('Password', { exact: true }).fill(workspace.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'A clear view of your pharmacy.' }),
  ).toBeVisible();
  const cookie = (await page.context().cookies()).find(
    (cookie) => cookie.name === 'gulf_session',
  );
  const digest = createHash('sha256').update(cookie!.value).digest('hex');
  await workspace.pool.query(
    "UPDATE auth_sessions SET created_at = now() - interval '2 hours', expires_at = now() - interval '1 hour' WHERE token_hash = $1",
    [digest],
  );
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page).toHaveURL(/\/admin\/login$/);
});
