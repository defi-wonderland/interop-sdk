import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Switch between dark-light theme', async ({ page }) => {
  const toggleButton = page.getByRole('button', { name: 'Toggle theme' });

  await toggleButton.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', /.*light.*/);

  await toggleButton.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', /.*dark.*/);
});

test('Footer links', async ({ page }) => {
  const footer = page.locator('footer');
  const sdkDocsLink = await footer.getByRole('link', { name: 'Interop SDK' }).getAttribute('href');
  const wonderlandLink = await footer.getByRole('link').last().getAttribute('href');

  expect(sdkDocsLink).toBe('https://docs.interop.wonderland.xyz/');
  expect(wonderlandLink).toBe('https://wonderland.xyz/');
});

test('Navigate to Interoperable Addresses', async ({ page }) => {
  await page.getByRole('link', { name: 'Interoperable Addresses' }).click();

  await expect(page).toHaveURL('/addresses');
  await expect(page.getByRole('heading', { name: 'Interoperable Addresses' })).toBeVisible();
});

test('Navigate to Cross-Chain Intent Swap', async ({ page }) => {
  await page.getByRole('link', { name: 'Cross-Chain Intent Swap' }).click();

  await expect(page).toHaveURL(/\/cross-chain/);
  await expect(page.getByRole('heading', { name: 'Cross-Chain Intent Swap' })).toBeVisible();
});
