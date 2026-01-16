import { test, expect } from '@playwright/test';

test.describe('Amount input validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cross-chain');
  });

  test('should enable Get Quotes button for valid positive amount', async ({ page }) => {
    await page.getByLabel('Amount').fill('10');
    await expect(page.getByRole('button', { name: 'Get Quotes' })).toBeEnabled();
  });

  test('should strip letters from input', async ({ page }) => {
    await page.getByLabel('Amount').fill('abc');
    await expect(page.getByLabel('Amount')).toHaveValue('');
  });

  test('should strip negative sign from input', async ({ page }) => {
    await page.getByLabel('Amount').fill('-10');
    await expect(page.getByLabel('Amount')).toHaveValue('10');
  });

  test('should disable Get Quotes button for zero value', async ({ page }) => {
    await page.getByLabel('Amount').fill('0');
    await expect(page.getByRole('button', { name: 'Get Quotes' })).toBeDisabled();
  });
});
