import { test, expect } from '@playwright/test';
import baseSepoliaEthLogs from '../test-data/base-sepolia-eth_getLogs.json' with { type: 'json' };
import baseSepoliaEthBlockNumber from '../test-data/base-sepolia-eth_blockNumber.json' with { type: 'json' };
import baseSepoliaEthGetBlockByNumber from '../test-data/base-sepolia-eth_getBlockByNumber.json' with { type: 'json' };

test.beforeEach(async ({ page }) => {
  await page.goto('/cross-chain?testnet=true');
});

test.describe('Recipient address input', () => {
  test('auto-fills with connected address on load', async ({ page }) => {
    const recipientInput = page.getByRole('textbox', { name: 'Recipient Address' });
    await expect(recipientInput).toHaveValue('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
  });

  test('allows user to clear input', async ({ page }) => {
    const recipientInput = page.getByRole('textbox', { name: 'Recipient Address' });
    await recipientInput.focus();
    await recipientInput.clear();

    await expect(recipientInput).toHaveValue('');
  });

  test('preserves custom recipient address', async ({ page }) => {
    const recipientInput = page.getByRole('textbox', { name: 'Recipient Address' });
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
    await page.locator('#input-token-select').selectOption({ label: 'USDC' });
    await page.locator('#output-token-select').selectOption({ label: 'USDC' });
    await page.getByRole('textbox', { name: 'Amount' }).fill('10');
    await expect(page.getByRole('button', { name: 'Get Quotes' })).toBeEnabled();
  });

  test('should strip letters from input', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Amount' }).fill('abc');
    await expect(page.getByRole('textbox', { name: 'Amount' })).toHaveValue('');
  });

  test('should strip negative sign from input', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Amount' }).fill('-10');
    await expect(page.getByRole('textbox', { name: 'Amount' })).toHaveValue('10');
  });

  test('should disable Get Quotes button for zero value', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Amount' }).fill('0');
    await expect(page.getByRole('button', { name: 'Get Quotes' })).toBeDisabled();
  });
});

test.describe('Cross-chain intents', () => {
  test('get quotes', async ({ page }) => {
    await page.locator('#input-token-select').selectOption({ label: 'USDC' });
    await page.locator('#output-token-select').selectOption({ label: 'USDC' });
    await page.getByRole('textbox', { name: 'Amount' }).fill('0.2');
    await page.getByRole('button', { name: 'Get Quotes' }).click();
    await page.locator('button').filter({ hasText: /Across Protocol/ }).click();

    await expect(page.getByRole('button', { name: 'Execute' })).toBeVisible();
  });

  test('execute transaction', async ({ page }) => {
    await page.route('https://base-sepolia-rpc.publicnode.com/', async (route) => {
      const postData = route.request().postDataJSON();

      if (postData?.method === 'eth_blockNumber') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: postData.id,
            result: baseSepoliaEthBlockNumber.result,
          }),
        });
      } else if (postData?.method === 'eth_getLogs') {
        // Extract the depositId filter from the request params
        const params = postData.params?.[0];
        const requestedDepositId = params?.topics?.[2]; // depositId is topic[2]

        // Get the original mock log
        const originalLog = baseSepoliaEthLogs.result[0];

        // Create response with matching depositId from the request
        const mockLog = {
          ...originalLog,
          topics: [
            originalLog.topics[0], // event signature
            originalLog.topics[1], // originChainId (keep Sepolia)
            requestedDepositId || originalLog.topics[2], // use requested depositId
            originalLog.topics[3], // relayer
          ],
        };

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: postData.id,
            result: [mockLog],
          }),
        });
      } else if (postData?.method === 'eth_getBlockByNumber') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: postData.id,
            result: baseSepoliaEthGetBlockByNumber.result,
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.locator('#input-token-select').selectOption({ label: 'USDC' });
    await page.locator('#output-token-select').selectOption({ label: 'USDC' });
    await page.getByRole('textbox', { name: 'Amount' }).fill('0.1');
    await page.getByRole('button', { name: 'Get Quotes' }).click();
    await page.locator('button').filter({ hasText: /Across Protocol/ }).click();
    await page.getByRole('button', { name: 'Execute' }).click();

    await expect(page.getByRole('heading', { name: 'Order Filled Successfully!' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start New Order' })).toBeVisible();
  });
});

test.describe('Address menu', () => {
  test('copy address', async ({ page }) => {
    await page.getByTestId('rk-account-button').click();
    await page.getByRole('button', { name: /Copy Address/i }).click();
    const clipboardText = await page.evaluate('navigator.clipboard.readText()');

    expect(clipboardText).toBe('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
  });

  test('disconnect from dapp', async ({ page }) => {
    await page.getByTestId('rk-account-button').click();
    await page.getByTestId('rk-disconnect-button').click();

    await expect(page.getByTestId('rk-connect-button')).toBeVisible();
  });
});

test.describe('Negative test', () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const provider = (globalThis as any).__e2eTestProvider;
      if (provider?.__internal) {
        provider.__internal.rejectSignature = true;
        provider.__internal.rejectTransaction = true;
      }
    });
  });

  test('rejects transaction', async ({ page }) => {
    await page.locator('#input-token-select').selectOption({ label: 'USDC' });
    await page.locator('#output-token-select').selectOption({ label: 'USDC' });
    const amountInput = page.getByLabel('Amount');
    await amountInput.fill('0.1');
    await page.getByRole('button', { name: 'Get Quotes' }).click();
    await page.locator('button').filter({ hasText: /Across Protocol/ }).click();
    await page.getByRole('button', { name: 'Execute' }).click();

    await expect(page.getByText('Transaction rejected')).toBeVisible();
  });
});
