import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('renders the live quote race table with all 4 providers', async ({ page }) => {
  const table = page.getByRole('region', { name: 'live quote race results' });
  await expect(table.locator('tbody tr')).toHaveCount(4);
});

test('re-run triggers a race that eventually settles a winner', async ({ page }) => {
  await page.getByRole('button', { name: 're-run quote race' }).click();
  await expect(page.getByText('winner').first()).toBeVisible({ timeout: 30_000 });
});

test('preset click updates the amount and triggers a race', async ({ page }) => {
  await page.getByRole('button', { name: '$10k', exact: true }).click();
  await expect(page.getByLabel('AMOUNT')).toHaveValue('10,000.00');
  await expect(page.getByText('winner').first()).toBeVisible({ timeout: 30_000 });
});

test('changing the FROM chain triggers a race', async ({ page }) => {
  await page.getByRole('button', { name: /^from:/ }).click();
  await page.getByRole('option', { name: 'ethereum' }).click();
  await expect(page.getByText('winner').first()).toBeVisible({ timeout: 30_000 });
});
