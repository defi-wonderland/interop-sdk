import { test, expect } from '@playwright/test';
import { INITIAL_ASSET_SYMBOL } from '../app/lib/requestBarDefaults';

test('initial render settles the race with winner and first pills within 60s', async ({ page }) => {
  await page.goto('/');
  const rows = page.getByRole('region', { name: 'live quote race results' }).locator('tbody tr');
  await expect(rows).toHaveCount(4);
  // At least one row must show the asset symbol in its output cell (= settled).
  // If chain discovery fails, all rows fall back to NO ROUTE — no symbol text — and this fails loud.
  await expect(rows.filter({ hasText: INITIAL_ASSET_SYMBOL }).first()).toBeVisible({ timeout: 60_000 });
  // Both pills must be rendered. They can land on the same row when the winner is also fastest,
  // but neither should ever disappear silently.
  await expect(rows.filter({ hasText: /winner/i }).first()).toBeVisible();
  await expect(rows.filter({ hasText: /first/i }).first()).toBeVisible();
});
