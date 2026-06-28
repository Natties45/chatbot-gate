import { test, expect } from '@playwright/test';

test.describe('web1 smoke tests', () => {
  test('NOC page loads with idle state', async ({ page }) => {
    await page.goto('/noc');
    await expect(page.locator('text=NOC Chat')).toBeVisible();
    await expect(page.locator('text=New Case')).toBeVisible();
  });

  test('Operation page loads with idle state', async ({ page }) => {
    await page.goto('/operation');
    await expect(page.locator('text=Operation Chat')).toBeVisible();
    await expect(page.locator('text=New Case')).toBeVisible();
  });

  test('redirects / to /noc', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/noc/);
  });

  test('New Case button opens chat in NOC', async ({ page }) => {
    await page.goto('/noc');
    await page.click('text=New Case');
    await expect(page.locator('textarea')).toBeVisible();
  });

  test('dark mode toggle exists in sidebar footer', async ({ page }) => {
    await page.goto('/noc');
    await expect(page.locator('[data-testid="theme-toggle"]')).toBeVisible();
  });
});

test.describe('MCP server health checks', () => {
  test('Docker MCP server responds', async ({ request }) => {
    const res = await request.get('http://localhost:1234/sse');
    expect(res.status()).toBe(200);
  });
});
