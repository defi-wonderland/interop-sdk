import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('renders the leaderboard with all 4 providers', async ({ page }) => {
  const table = page.getByRole('region', { name: 'provider leaderboard' });
  await expect(table.locator('tbody tr')).toHaveCount(4);
});

test('sorts by success rate, relay on top', async ({ page }) => {
  const firstRow = page.getByRole('region', { name: 'provider leaderboard' }).locator('tbody tr').first();
  await expect(firstRow).toContainText('relay');
  await expect(firstRow).toContainText('99.2%');
});

test('renders the bungee placeholder row with no global feed', async ({ page }) => {
  const table = page.getByRole('region', { name: 'provider leaderboard' });
  const bungeeRow = table.locator('tbody tr').filter({ hasText: 'bungee' });
  await expect(bungeeRow).toContainText('no global feed');
  await expect(bungeeRow).toContainText('—');
});
