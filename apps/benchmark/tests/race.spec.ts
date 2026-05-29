import { test, expect } from '@playwright/test';

test('all four providers populate the race table within 60s', async ({ page }) => {
  await page.goto('/');
  const rows = page.getByRole('region', { name: 'live quote race results' }).locator('tbody tr');
  // A row is "populated" when it either shows the asset symbol (settled quote)
  // or a NO ROUTE pill (errored). Idle/querying rows have neither.
  await expect(rows.filter({ hasText: /USDC|no route/i })).toHaveCount(4, { timeout: 60_000 });
});
