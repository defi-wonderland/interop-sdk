import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/cross-chain');
});

test.describe('Recipient address input', () => {
  test('auto-fills with connected address on load', async ({ page }) => {
    const recipientInput = page.getByRole('textbox', { name: 'Recipient Address' });
    await expect(recipientInput).toHaveValue('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
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

test.describe('Amount input validation', () => {
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
