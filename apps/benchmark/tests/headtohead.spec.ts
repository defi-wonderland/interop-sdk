import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('renders the head-to-head table with all 4 providers', async ({ page }) => {
  const table = page.getByRole('region', { name: 'head-to-head comparison' });
  await expect(table.locator('tbody tr')).toHaveCount(4);
});

test('every row shows either a BEST AT badge or the no-activity footer', async ({ page }) => {
  const table = page.getByRole('region', { name: 'head-to-head comparison' });
  const rows = table.locator('tbody tr');
  await expect(rows).toHaveCount(4, { timeout: 30_000 });
  const rowCount = await rows.count();

  for (let i = 0; i < rowCount; i++) {
    const row = rows.nth(i);
    const bestAtCell = row.locator('td').last();
    const cellText = (await bestAtCell.textContent()) ?? '';
    const hasBadge = /FASTEST|CHEAPEST|MOST ACTIVE/.test(cellText);
    const hasDash = cellText.includes('—');
    expect(hasBadge || hasDash).toBe(true);
  }
});

test('bungee row shows em-dashes and no global feed', async ({ page }) => {
  const table = page.getByRole('region', { name: 'head-to-head comparison' });
  const bungeeRow = table.locator('tbody tr').filter({ hasText: 'bungee' });
  await expect(bungeeRow).toContainText('no global feed');
  // BEST AT cell should render the em-dash (no badges for placeholder).
  const bestAtCell = bungeeRow.locator('td').last();
  await expect(bestAtCell).toContainText('—');
});
