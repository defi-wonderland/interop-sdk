import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('renders the race table with all 4 providers', async ({ page }) => {
  const table = page.getByRole('region', { name: 'live quote race results' });
  await expect(table.locator('tbody tr')).toHaveCount(4);
});

test('shows the winner pill on the settled top row', async ({ page }) => {
  await expect(page.getByText('winner').locator('visible=true').first()).toBeVisible();
});

test('shows a no-route pill for the errored provider', async ({ page }) => {
  await expect(page.getByText('no route').locator('visible=true').first()).toBeVisible();
});

test('preset click updates the amount field', async ({ page }) => {
  await page.getByRole('button', { name: '$10k', exact: true }).click();
  await expect(page.getByLabel('AMOUNT')).toHaveValue('10,000.00');
});

test('swap button flips the FROM and TO chains', async ({ page }) => {
  const fromButton = page.getByRole('button', { name: /^from:/i });
  const toButton = page.getByRole('button', { name: /^to:/i });
  const fromBefore = await fromButton.textContent();
  const toBefore = await toButton.textContent();

  await page.getByRole('button', { name: 'swap from and to chains' }).click();

  await expect(fromButton).not.toHaveText(fromBefore ?? '');
  await expect(toButton).not.toHaveText(toBefore ?? '');
});
