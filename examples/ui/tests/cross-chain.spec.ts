import { test, expect } from '@playwright/test';

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
 * Mock quote response from Across API
 */
const MOCK_QUOTE_RESPONSE = {
  deposit: {
    inputToken: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    outputToken: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    inputAmount: '200000',
    outputAmount: '199000',
    originChainId: 11155111,
    destinationChainId: 84532,
    depositor: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    recipient: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    message: '0x',
    quoteTimestamp: Math.floor(Date.now() / 1000),
    fillDeadline: Math.floor(Date.now() / 1000) + 3600,
    exclusivityDeadline: 0,
    exclusiveRelayer: '0x0000000000000000000000000000000000000000',
  },
  fees: {
    totalRelayFee: { pct: '100000000000000', total: '1000' },
    relayerCapitalFee: { pct: '50000000000000', total: '500' },
    relayerGasFee: { pct: '50000000000000', total: '500' },
    lpFee: { pct: '0', total: '0' },
  },
  limits: { minDeposit: '1000', maxDeposit: '1000000000000', maxDepositInstant: '100000000000' },
  estimatedFillTimeSec: 60,
  spokePoolAddress: '0x5ef6C01E11889d86803e0B23e3cB3F9E9d97B662',
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
