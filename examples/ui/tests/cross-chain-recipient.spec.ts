import { test, expect } from '@playwright/test';
import { isAddress } from 'viem';

test.beforeEach(async ({ page }) => {
  await page.goto('/cross-chain');
});

test.describe('Recipient address input', () => {
  test('auto-fills with connected address on load', async ({ page }) => {
    const recipientInput = page.getByLabel('Recipient Address');
    const value = await recipientInput.inputValue();
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
