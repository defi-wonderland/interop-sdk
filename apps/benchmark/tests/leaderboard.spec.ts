import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('renders the leaderboard with all 4 providers', async ({ page }) => {
  const table = page.getByRole('region', { name: 'provider leaderboard' });
  await expect(table.locator('tbody tr')).toHaveCount(4);
});

test('top row shows a real success rate value, not an em-dash', async ({ page }) => {
  // Numbers come from live history APIs, so we cannot assert a specific
  // provider or percentage. Instead require that the top row resolved to a
  // numeric success rate — proves the SSR fetch + aggregation actually ran.
  const firstRow = page.getByRole('region', { name: 'provider leaderboard' }).locator('tbody tr').first();
  // SUCCESS column is the 4th td (rank, provider, fills, success).
  const successText = (await firstRow.locator('td').nth(3).innerText()).trim();
  expect(successText, 'top row success rate should be a percentage').toMatch(/^\d+(\.\d+)?%$/);
});

test('renders the bungee placeholder row with no global feed', async ({ page }) => {
  const table = page.getByRole('region', { name: 'provider leaderboard' });
  const bungeeRow = table.locator('tbody tr').filter({ hasText: 'bungee' });
  await expect(bungeeRow).toContainText('no global feed');
  // Every numeric column (cells 2 through 6: fills, success, p50, p99, fee)
  // must render the em-dash. Asserting `toContainText('—')` alone would pass
  // if any single cell had it, missing a regression that fills another column.
  for (const cellIndex of [2, 3, 4, 5, 6]) {
    const text = await bungeeRow.locator('td').nth(cellIndex).innerText();
    expect(text.trim(), `cell ${cellIndex} should be em-dash`).toBe('—');
  }
});
