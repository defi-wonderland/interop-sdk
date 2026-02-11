import { test, expect } from '@playwright/test';
import baseSepoliaEthLogs from '../test-data/base-sepolia-eth_getLogs.json' with { type: 'json' };
import baseSepoliaEthBlockNumber from '../test-data/base-sepolia-eth_blockNumber.json' with { type: 'json' };
import baseSepoliaEthGetBlockByNumber from '../test-data/base-sepolia-eth_getBlockByNumber.json' with { type: 'json' };

/**
 * Mock token data for asset discovery
 * Returns USDC tokens for testnet chains (Sepolia, Base Sepolia, Arbitrum Sepolia)
 */
const MOCK_TOKENS = [
  { chainId: 11155111, address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', symbol: 'USDC', decimals: 6 },
  { chainId: 84532, address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', symbol: 'USDC', decimals: 6 },
  { chainId: 421614, address: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', symbol: 'USDC', decimals: 6 },
];

/**
 * Mock quote response from Across API (matches AcrossGetQuoteResponseSchema)
 */
const MOCK_QUOTE_RESPONSE = {
  id: 'e2e-test-quote-id',
  inputToken: {
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    chainId: 11155111,
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
  },
  outputToken: {
    address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    chainId: 84532,
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
  },
  inputAmount: '200000',
  expectedOutputAmount: '199000',
  minOutputAmount: '198000',
  fees: {
    total: {
      amount: '1000',
      amountUsd: '0.001',
      pct: '500000000000000',
    },
  },
  swapTx: {
    simulationSuccess: true,
    chainId: 11155111,
    to: '0x5ef6C01E11889d86803e0B23e3cB3F9E9d97B662',
    data: '0xad5425c6000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb922660000000000000000000000001c7d4b196cb0c7b01d743fbc6116a902379c7238000000000000000000000000036cbd53842c5426634e7929541ec2318f3dcf7e0000000000000000000000000000000000000000000000000000000000030d400000000000000000000000000000000000000000000000000000000000030718000000000000000000000000000000000000000000000000000000000001499400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001800000000000000000000000000000000000000000000000000000000000000000',
    gas: '250000',
    maxFeePerGas: '1000000000',
    maxPriorityFeePerGas: '1000000000',
  },
  expectedFillTime: 60,
};

test.beforeEach(async ({ page, context }) => {
  await context.route('**/api/swap/tokens**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_TOKENS),
    });
  });

  await context.route('**/api/swap/approval**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_QUOTE_RESPONSE),
    });
  });

  await page.goto('/cross-chain?testnet=true');
});

test.describe('Asset Discovery', () => {
  test('displays swap form after successful discovery', async ({ page }) => {
    await expect(page.getByRole('textbox', { name: 'Amount' })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#input-token-select')).toBeVisible();
    await expect(page.locator('#output-token-select')).toBeVisible();
  });

  test('populates token selectors with discovered assets', async ({ page }) => {
    await expect(page.locator('#input-token-select')).toBeVisible({ timeout: 15000 });

    const inputOptions = await page.locator('#input-token-select option').count();
    const outputOptions = await page.locator('#output-token-select option').count();

    expect(inputOptions).toBeGreaterThan(0);
    expect(outputOptions).toBeGreaterThan(0);
  });

  test('allows retry after discovery failure', async ({ page, context }) => {
    await context.unroute('**/api/swap/tokens**');
    await context.route('**/api/swap/tokens**', (route) => route.abort('failed'));
    await page.reload();

    const retryButton = page.getByRole('button', { name: /Try Again/i });
    await expect(retryButton).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Failed to discover assets/i)).toBeVisible();

    await context.unroute('**/api/swap/tokens**');
    await context.route('**/api/swap/tokens**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_TOKENS),
      });
    });
    await retryButton.click();

    await expect(page.getByRole('textbox', { name: 'Amount' })).toBeVisible({ timeout: 15000 });
  });
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
    await page
      .locator('button')
      .filter({ hasText: /Across Protocol/ })
      .click();

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
    await page
      .locator('button')
      .filter({ hasText: /Across Protocol/ })
      .click();
    await page.getByRole('button', { name: 'Execute' }).click();

    await expect(page.getByText('Transaction rejected')).toBeVisible();
  });
});
