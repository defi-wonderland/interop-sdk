import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('ChainDropdown - Select chain (happy path)', async ({ page }) => {
  await page.getByRole('button', { name: 'Select chain...' }).click();
  await page.getByPlaceholder('Search chain..').fill('ethereum');
  await page.getByText('Ethereum Mainnet').first().click();

  await expect(page.getByPlaceholder('Search chain...')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Ethereum Mainnet', exact: true })).toBeVisible();
});

test('ChainDropdown - No chains found', async ({ page }) => {
  await page.getByRole('button', { name: 'Select chain...' }).click();
  await page.getByPlaceholder('Search chain..').fill('xyznonexistent');

  await expect(page.getByText('No chains found')).toBeVisible();
});
