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
  const sdkDocsLink = await page.getByRole('link', { name: 'Interop SDK' }).getAttribute('href');
  const wonderlandLink = await page.getByRole('link').last().getAttribute('href');

  expect(sdkDocsLink).toBe('https://docs.interop.wonderland.xyz/');
  expect(wonderlandLink).toBe('https://wonderland.xyz/');
});
