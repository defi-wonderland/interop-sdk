import { test, expect } from '@playwright/test';
import mockTokens from './test-data/mock-tokens.json' with { type: 'json' };
import mockCalldata from './test-data/mock-quote-calldata.json' with { type: 'json' };
import mockQuoteResponse from './test-data/mock-quote-response.json' with { type: 'json' };

/**
 * Builds a mock Across API quote response with calldata that matches the requested amount.
 * The calldata is ABI-encoded for the SpokePool deposit(bytes32,...) function.
 */
function buildMockQuoteResponse(inputAmount: string) {
  const input = BigInt(inputAmount);
  const output = input - 1000n;
  const inputHex = input.toString(16).padStart(64, '0');
  const outputHex = output.toString(16).padStart(64, '0');

  const data = mockCalldata.prefix + inputHex + outputHex + mockCalldata.suffix;

  return {
    ...mockQuoteResponse,
    inputAmount,
    expectedOutputAmount: output.toString(),
    minOutputAmount: (output - 1000n).toString(),
    swapTx: {
      ...mockQuoteResponse.swapTx,
      data,
    },
  };
}

test.beforeEach(async ({ page, context }) => {
  // Mock Across asset discovery
  await context.route('**/api/swap/tokens**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockTokens),
    });
  });

  // Mock Across quote — build response with calldata matching the requested amount
  await context.route('**/api/swap/approval**', async (route) => {
    const url = new URL(route.request().url());
    const amount = url.searchParams.get('amount') || '200000';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildMockQuoteResponse(amount)),
    });
  });

  // Block OIF aggregator calls so they fail fast instead of timing out
  await context.route('**/oif-api.openzeppelin.com/**', (route) => route.abort('blockedbyclient'));

  await page.goto('/cross-chain?testnet=true');
});

test.describe('Asset Discovery', () => {
  test('displays swap form after successful discovery', async ({ page }) => {
    await expect(page.getByRole('textbox', { name: 'Amount' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('input-token-select')).toBeVisible();
    await expect(page.getByTestId('output-token-select')).toBeVisible();
  });

  test('populates token selectors with discovered assets', async ({ page }) => {
    await expect(page.getByTestId('input-token-select')).toBeVisible({ timeout: 15000 });

    // Open input dropdown and count options
    await page.getByTestId('input-token-select').click();
    const inputOptions = await page.getByTestId('input-token-select-listbox').locator('button').count();
    expect(inputOptions).toBeGreaterThan(0);

    // Close by clicking trigger again, then check output
    await page.getByTestId('input-token-select').click();
    await page.getByTestId('output-token-select').click();
    const outputOptions = await page.getByTestId('output-token-select-listbox').locator('button').count();
    expect(outputOptions).toBeGreaterThan(0);
  });

  // Testnet Across uses static discovery (no network requests), so route interception
  // can't block it. This test only works when discovery relies on API calls.
  test.skip('allows retry after discovery failure', async ({ page, context }) => {
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
        body: JSON.stringify(mockTokens),
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
    await page.getByTestId('input-token-select').click();
    await page.getByTestId('input-token-select-listbox').getByText('USDC').click();
    await page.getByRole('textbox', { name: 'Amount' }).fill('10');
    await expect(page.getByTestId('submit-button')).toBeEnabled();
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
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });
});

test.describe('Cross-chain intents', () => {
  test('get quotes', async ({ page }) => {
    // Select input token via custom dropdown
    await page.getByTestId('input-token-select').click();
    await page.getByTestId('input-token-select-listbox').getByText('USDC').click();

    // Select output token via custom dropdown
    await page.getByTestId('output-token-select').click();
    await page.getByTestId('output-token-select-listbox').getByText('USDC').click();

    await page.getByRole('textbox', { name: 'Amount' }).fill('0.2');
    await page.locator('button[type="submit"]').click();
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

test.describe('Build quote fee display', () => {
  test('shows fee percentage for same-token with output < input', async ({ page }) => {
    await page.getByRole('button', { name: 'Build Quote' }).click();

    await page.getByTestId('input-token-select').click();
    await page.getByTestId('input-token-select-listbox').getByText('USDC').click();
    await page.getByTestId('output-token-select').click();
    await page.getByTestId('output-token-select-listbox').getByText('USDC').click();

    await page.getByLabel('You send').fill('1');
    await page.getByLabel('You receive').fill('0.99');

    await expect(page.getByTestId('fee-display')).toBeVisible();
    await expect(page.getByTestId('fee-hint')).not.toBeVisible();
  });

  test('shows warning when output equals input for same token', async ({ page }) => {
    await page.getByRole('button', { name: 'Build Quote' }).click();

    await page.getByTestId('input-token-select').click();
    await page.getByTestId('input-token-select-listbox').getByText('USDC').click();
    await page.getByTestId('output-token-select').click();
    await page.getByTestId('output-token-select-listbox').getByText('USDC').click();

    await page.getByLabel('You send').fill('1');
    await page.getByLabel('You receive').fill('1');

    await expect(page.getByTestId('fee-warning')).toBeVisible();
    await expect(page.getByTestId('fee-display')).not.toBeVisible();
  });

  test('shows default hint before output is filled', async ({ page }) => {
    await page.getByRole('button', { name: 'Build Quote' }).click();

    await page.getByLabel('You send').fill('1');

    await expect(page.getByTestId('fee-hint')).toBeVisible();
  });
});

test.describe('Build Quote submit validation', () => {
  test('should disable submit when "You receive" is empty', async ({ page }) => {
    await expect(page.getByRole('textbox', { name: 'Amount' })).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Build Quote' }).click();
    await page.getByTestId('input-token-select').click();
    await page.getByTestId('input-token-select-listbox').getByText('USDC').click();
    await page.getByLabel('You send').fill('10');

    const submitBtn = page.getByTestId('submit-button');
    await expect(submitBtn).toBeDisabled();
    await expect(submitBtn).toHaveText('Build Quote');
  });

  test('should disable submit when output >= input for same token', async ({ page }) => {
    await expect(page.getByRole('textbox', { name: 'Amount' })).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Build Quote' }).click();

    await page.getByTestId('input-token-select').click();
    await page.getByTestId('input-token-select-listbox').getByText('USDC').click();
    await page.getByTestId('output-token-select').click();
    await page.getByTestId('output-token-select-listbox').getByText('USDC').click();

    await page.getByLabel('You send').fill('1');
    await page.getByLabel('You receive').fill('1');

    await expect(page.getByTestId('fee-warning')).toBeVisible();
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeDisabled();
    await expect(submitBtn).toHaveText('Build Quote');
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
    // Select input token via custom dropdown
    await page.getByTestId('input-token-select').click();
    await page.getByTestId('input-token-select-listbox').getByText('USDC').click();

    // Select output token via custom dropdown
    await page.getByTestId('output-token-select').click();
    await page.getByTestId('output-token-select-listbox').getByText('USDC').click();

    const amountInput = page.getByLabel('Amount');
    await amountInput.fill('0.1');
    await page.locator('button[type="submit"]').click();
    await page
      .locator('button')
      .filter({ hasText: /Across Protocol/ })
      .click();
    await page.getByRole('button', { name: 'Execute' }).click();

    await expect(page.getByText('Transaction rejected')).toBeVisible();
  });
});
