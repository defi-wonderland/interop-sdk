import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/addresses');
  await page.getByRole('button', { name: 'From text' }).click();
});

test.describe('"From text" tab - Convert address', () => {
  test('Convert address', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Interoperable Name' }).fill('vitalik.eth@eth');
    await page.getByRole('button', { name: 'Convert' }).click();

    await expect(page.getByRole('button', { name: 'Convert' })).toBeEnabled({ timeout: 30000 });
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
      await page.getByRole('button', { name: 'Convert' }).click();

      await expect(page.getByRole('button', { name: 'Convert' })).toBeEnabled({ timeout: 30000 });
      await expect(page.getByRole('heading', { name: 'Interoperable Name Format' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Binary Format' })).toBeVisible();
    }
  });
});

test.describe('"From text" tab - Input validations', () => {
  test('Convert button is disabled when Interoperable Name input is empty', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Convert' })).toBeDisabled();
  });

  test('Shows error for missing chain reference', async ({ page }) => {
    const invalidAddress = 'vitalik.eth';
    await page.getByRole('textbox', { name: 'Interoperable Name' }).fill(invalidAddress);
    await page.getByRole('button', { name: 'Convert' }).click();

    await expect(page.getByText(`Invalid interoperable name: ${invalidAddress}`)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Interoperable Name Format' })).not.toBeVisible();
  });

  test('Shows error for ENS name with chain type but no chain reference', async ({ page }) => {
    const ensNameWithChainType = 'vitalik.eth@eip155';
    await page.getByRole('textbox', { name: 'Interoperable Name' }).fill(ensNameWithChainType);
    await page.getByRole('button', { name: 'Convert' }).click();

    await expect(
      page.getByText(
        'Invalid interoperable name: ENS names require a specific chain reference (e.g., @eip155:1). Use @<chainType>:<reference> format.',
      ),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Interoperable Name Format' })).not.toBeVisible();
  });

  test('Shows error for invalid chain identifier', async ({ page }) => {
    const invalidChainIdentifier = 'invalidchain';
    await page.getByRole('textbox', { name: 'Interoperable Name' }).fill(`vitalik.eth@${invalidChainIdentifier}`);
    await page.getByRole('button', { name: 'Convert' }).click();

    await expect(
      page.getByText(
        `Invalid chain identifier: Chain reference "${invalidChainIdentifier}" could not be resolved to a valid chain type`,
      ),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Interoperable Name Format' })).not.toBeVisible();
  });

  test('Shows error for invalid address format', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Interoperable Name' }).fill('0x123@eth');
    await page.getByRole('button', { name: 'Convert' }).click();

    await expect(page.getByText('EVM address must be a valid Ethereum address')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Interoperable Name Format' })).not.toBeVisible();
  });
});

test.describe('Error handling', () => {
  test('displays user-friendly error message on network failure', async ({ page }) => {
    const USER_FRIENDLY_ERROR_MESSAGE = 'please try again or check your connection';

    await page.route('**/*', (route) => {
      const postData = route.request().postData();
      // Reject all rpc calls
      if (postData?.includes('eth_call')) {
        return route.abort('failed');
      }
      return route.continue();
    });

    await page.getByRole('textbox', { name: 'Interoperable Name' }).fill('vitalik.eth@eth');
    await page.getByRole('button', { name: 'Convert' }).click();

    const errorContainer = page.getByTestId('error-container');
    await expect(errorContainer).toBeVisible();
    await expect(errorContainer).toContainText(USER_FRIENDLY_ERROR_MESSAGE);
  });
});
