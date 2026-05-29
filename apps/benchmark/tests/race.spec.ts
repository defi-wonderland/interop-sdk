import { test, expect } from '@playwright/test';

test('initial render shows at least one settled quote within 60s', async ({ page }) => {
  await page.goto('/');
  const rows = page.getByRole('region', { name: 'live quote race results' }).locator('tbody tr');
  await expect(rows).toHaveCount(4);
  // Requires at least one row with a real settled quote (asset symbol in the output cell).
  // Catches the case where chain discovery fails and every row falls back to "NO ROUTE" —
  // a weaker assertion like /USDC|no route/i would let that degraded state pass silently.
  await expect(rows.filter({ hasText: 'USDC' }).first()).toBeVisible({ timeout: 60_000 });
});
