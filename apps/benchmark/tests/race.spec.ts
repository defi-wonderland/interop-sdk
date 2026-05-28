import { test, expect } from '@playwright/test';

const RUN_LIVE = process.env.RUN_LIVE === '1';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('renders the race table with all 4 providers', async ({ page }) => {
  const table = page.getByRole('region', { name: 'live quote race results' });
  await expect(table.locator('tbody tr')).toHaveCount(4);
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

test.describe('live SDK trigger', () => {
  test.skip(!RUN_LIVE, 'set RUN_LIVE=1 to hit real aggregator APIs');

  test('initial render shows a winner pill once quotes settle', async ({ page }) => {
    await expect(page.getByText('winner').filter({ visible: true }).first()).toBeVisible({ timeout: 30_000 });
  });

  test('re-run triggers a race that eventually settles a winner', async ({ page }) => {
    await page.getByRole('button', { name: 're-run quote race' }).click();
    await expect(page.getByText('winner').first()).toBeVisible({ timeout: 30_000 });
  });

  test('preset click triggers a race', async ({ page }) => {
    await page.getByRole('button', { name: '$10k', exact: true }).click();
    await expect(page.getByText('winner').first()).toBeVisible({ timeout: 30_000 });
  });

  test('changing the FROM chain triggers a race', async ({ page }) => {
    await page.getByRole('button', { name: /^from:/ }).click();
    await page.getByRole('option', { name: 'ethereum' }).click();
    await expect(page.getByText('winner').first()).toBeVisible({ timeout: 30_000 });
  });
});
