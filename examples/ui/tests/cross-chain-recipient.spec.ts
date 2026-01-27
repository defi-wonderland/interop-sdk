import { test, expect } from '@playwright/test';
import { isAddress } from 'viem';

test.beforeEach(async ({ page }) => {
  await page.goto('/cross-chain');
  // Wait for wallet to connect and auto-fill recipient
  await expect(page.getByLabel('Recipient Address')).not.toBeEmpty({ timeout: 500 });
});

test.describe('Recipient address input', () => {
  test('auto-fills with connected address on load', async ({ page }) => {
    const value = await page.getByLabel('Recipient Address').inputValue();
    expect(isAddress(value)).toBe(true);
  });

  test('allows user to clear input', async ({ page }) => {
    const recipientInput = page.getByLabel('Recipient Address');

    await recipientInput.clear();

    await expect(recipientInput).toHaveValue('');
  });

  test('preserves custom recipient address', async ({ page }) => {
    const recipientInput = page.getByLabel('Recipient Address');
    const customRecipient = '0xABCDEF1234567890abcdef1234567890ABCDEF12';

    await recipientInput.clear();
    await recipientInput.fill(customRecipient);
    await expect(recipientInput).toHaveValue(customRecipient);

    await recipientInput.blur();
    await expect(recipientInput).toHaveValue(customRecipient);
  });
});
