import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Build tab - Convert address', async ({ page }) => {
  await page
    .getByRole('textbox', { name: 'Address @ Chain Reference' })
    .fill('0x1234567890AbcdEF1234567890aBcdef12345678');

  await page.getByRole('button', { name: 'Select chain...' }).click();
  await page.getByText('Ethereum Mainnet').first().click();

  await page.getByRole('button', { name: 'Convert' }).click();

  await expect(page.getByRole('heading', { name: 'Human-Readable Format' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Binary Format' })).toBeVisible();
});

test('Build tab - Use example chips', async ({ page }) => {
  const exampleChips: string[] = [
    'vitalik.eth (Ethereum Mainnet)',
    'nick.eth (Arbitrum One)',
    '0x8335...A02913 (Base)',
  ];

  for (const locator of exampleChips) {
    await page.getByRole('button', { name: locator }).click();
    await page.getByRole('button', { name: 'Convert' }).click();

    await expect(page.getByRole('heading', { name: 'Human-Readable Format' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Binary Format' })).toBeVisible();
  }
});
