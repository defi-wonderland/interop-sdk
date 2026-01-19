import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/addresses');
});

test.describe('Build tab - Convert address', () => {
  test('Convert address', async ({ page }) => {
    await page
      .getByRole('textbox', { name: 'Address @ Chain Reference' })
      .fill('0x1234567890AbcdEF1234567890aBcdef12345678');

    await page.getByRole('button', { name: 'Select chain...' }).click();
    await page.getByText('Ethereum Mainnet').first().click();

    await page.getByRole('button', { name: 'Convert' }).click();

    await expect(page.getByRole('heading', { name: 'Interoperable Name Format' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Binary Format' })).toBeVisible();
  });

  test('Use example chips', async ({ page }) => {
    const exampleChips: string[] = [
      'vitalik.eth (Ethereum Mainnet)',
      'nick.eth (Arbitrum One)',
      '0x8335...A02913 (Base)',
    ];

    for (const locator of exampleChips) {
      await page.getByRole('button', { name: locator }).click();
      await expect(page.getByRole('button', { name: 'Convert' })).toBeEnabled();
      await page.getByRole('button', { name: 'Convert' }).click();

      await expect(page.getByRole('heading', { name: 'Interoperable Name Format' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Binary Format' })).toBeVisible();
    }
  });
});

test.describe('Build tab - Chain dropdown', () => {
  test('Select chain (happy path)', async ({ page }) => {
    await page.getByRole('button', { name: 'Select chain...' }).click();
    await page.getByPlaceholder('Search chain...').fill('ethereum');
    await page.getByText('Ethereum Mainnet').last().click();

    await expect(page.getByPlaceholder('Search chain...')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Ethereum Mainnet', exact: true })).toBeVisible();
  });

  test('No chains found', async ({ page }) => {
    await page.getByRole('button', { name: 'Select chain...' }).click();
    await page.getByPlaceholder('Search chain...').fill('xyznonexistent');

    await expect(page.getByText('No chains found')).toBeVisible();
  });
});

test.describe('Build tab - Address input validations', () => {
  test('Convert button is disabled when address is empty', async ({ page }) => {
    await page.getByRole('button', { name: 'Select chain...' }).click();
    await page.waitForTimeout(5000);
    await page.getByText('Ethereum Mainnet').last().click();

    await expect(page.getByRole('button', { name: 'Convert' })).toBeDisabled();
  });

  test('Convert button is disabled when chain is not selected', async ({ page }) => {
    await page
      .getByRole('textbox', { name: 'Address @ Chain Reference' })
      .fill('0x1234567890AbcdEF1234567890aBcdef12345678');

    await expect(page.getByRole('button', { name: 'Convert' })).toBeDisabled();
  });

  test('Convert button is disabled when both inputs are empty', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Convert' })).toBeDisabled();
  });

  test('Shows error for invalid address format', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Address @ Chain Reference' }).fill('invalid-address');
    await page.getByRole('button', { name: 'Select chain...' }).click();
    await page.getByText('Ethereum Mainnet').last().click();
    await page.getByRole('button', { name: 'Convert' }).click();

    await expect(page.getByText('EVM address must be a valid Ethereum address')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Interoperable Name Format' })).not.toBeVisible();
  });

  test('Shows error when address has incorrect length', async ({ page }) => {
    await page
      .getByRole('textbox', { name: 'Address @ Chain Reference' })
      .fill('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA0291');
    await page.getByRole('button', { name: 'Select chain...' }).click();
    await page.getByText('Ethereum Mainnet').last().click();
    await page.getByRole('button', { name: 'Convert' }).click();

    await expect(page.getByText('EVM address must be a valid Ethereum address')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Interoperable Name Format' })).not.toBeVisible();
  });

  test('Shows error for invalid human readable address', async ({ page }) => {
    const invalidCharactersAddress = '0xXYZ$#';
    await page.getByRole('textbox', { name: 'Address @ Chain Reference' }).fill(invalidCharactersAddress);

    await page.getByRole('button', { name: 'Select chain...' }).click();
    await page.getByText('Ethereum Mainnet').last().click();
    await page.getByRole('button', { name: 'Convert' }).click();

    await expect(page.getByText(`Invalid interoperable name: ${invalidCharactersAddress}`)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Interoperable Name Format' })).not.toBeVisible();
  });
});
