import { test, expect } from '@playwright/test';
import { INITIAL_ASSET_SYMBOL } from '../app/lib/requestBarDefaults';

test('initial render settles the race with winner and first pills within 60s', async ({ page }) => {
  await page.goto('/');
  const rows = page.getByRole('region', { name: 'live quote race results' }).locator('tbody tr');
  await expect(rows).toHaveCount(4);
  // At least one row must show a real numeric output amount followed by the asset symbol.
  // A weaker check like `hasText: 'USDC'` would pass on a degraded settled row that still
  // renders the symbol next to an em-dash placeholder.
  const settledOutput = new RegExp(`\\d[\\d,]*(?:\\.\\d+)?\\s*${INITIAL_ASSET_SYMBOL}`);
  await expect(rows.filter({ hasText: settledOutput }).first()).toBeVisible({ timeout: 60_000 });
  // Both pills must be rendered. They can land on the same row when the winner is also fastest,
  // but neither should ever disappear silently.
  await expect(rows.filter({ hasText: /winner/i }).first()).toBeVisible();
  await expect(rows.filter({ hasText: /first/i }).first()).toBeVisible();
});
