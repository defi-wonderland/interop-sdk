import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('renders the head-to-head table with all 4 providers', async ({ page }) => {
  const table = page.getByRole('region', { name: 'head-to-head comparison' });
  await expect(table.locator('tbody tr')).toHaveCount(4);
});

test('awards FASTEST and CHEAPEST badges to relay', async ({ page }) => {
  const table = page.getByRole('region', { name: 'head-to-head comparison' });
  const relayRow = table.locator('tbody tr').filter({ hasText: 'relay' });
  await expect(relayRow).toContainText('FASTEST');
  await expect(relayRow).toContainText('CHEAPEST');
});

test('awards MOST ACTIVE badge to across', async ({ page }) => {
  const table = page.getByRole('region', { name: 'head-to-head comparison' });
  const acrossRow = table.locator('tbody tr').filter({ hasText: 'across' });
  await expect(acrossRow).toContainText('MOST ACTIVE');
});

test('bungee row shows em-dashes and no global feed', async ({ page }) => {
  const table = page.getByRole('region', { name: 'head-to-head comparison' });
  const bungeeRow = table.locator('tbody tr').filter({ hasText: 'bungee' });
  await expect(bungeeRow).toContainText('no global feed');
  // BEST AT cell should render the em-dash (no badges for placeholder).
  const bestAtCell = bungeeRow.locator('td').last();
  await expect(bestAtCell).toContainText('—');
});
