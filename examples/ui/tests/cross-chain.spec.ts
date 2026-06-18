import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
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

    await page.getByTestId('input-token-select').click();
    const inputOptions = await page.getByTestId('input-token-select-listbox').locator('button').count();
    expect(inputOptions).toBeGreaterThan(0);

    // Close by clicking trigger again, then check output
    await page.getByTestId('input-token-select').click();
    await page.getByTestId('output-token-select').click();
    const outputOptions = await page.getByTestId('output-token-select-listbox').locator('button').count();
    expect(outputOptions).toBeGreaterThan(0);
  });
});

test.describe('Recipient address input', () => {
  test('auto-fills with connected address on load', async ({ page }) => {
    const recipientInput = page.getByRole('textbox', { name: 'Recipient Address' });

    await expect(recipientInput).toHaveValue('0xc59c92D9d6064464280B621C42A6ECDa0EA2D29b');
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
    await page.getByTestId('input-token-select').click();
    await page.getByTestId('input-token-select-listbox').getByText('USDC').click();
    await page.getByTestId('output-token-select').click();
    await page.getByTestId('output-token-select-listbox').getByText('USDC').click();
    await page.getByRole('textbox', { name: 'Amount' }).fill('0.2');
    await page.locator('button[type="submit"]').click();
    await page
      .locator('button')
      .filter({ hasText: /Across Protocol/ })
      .click();

    await expect(page.getByRole('button', { name: 'Execute' })).toBeVisible();
    await expect(page
      .locator('button')
      .filter({ hasText: /Relay/ }))
      .toBeVisible();
    await expect(page
      .locator('button')
      .filter({ hasText: /LI.FI/ }))
      .toBeVisible();
  });

  test('executes a cross-chain intent (no mocks)', async ({ page }) => {
    test.setTimeout(180_000);
    await page.locator('#input-chain-select').selectOption({ label: 'Sepolia' });
    await page.locator('#output-chain-select').selectOption({ label: 'Base Sepolia' });
    await page.getByTestId('input-token-select').click();
    await page.getByTestId('input-token-select-listbox').getByText('USDC').click();
    await page.getByTestId('output-token-select').click();
    await page.getByTestId('output-token-select-listbox').getByText('USDC').click();
    await page.getByRole('textbox', { name: 'Amount' }).fill('0.03');
    await page.getByRole('button', { name: 'Get Quotes' }).last().click();
    await page
      .locator('button')
      .filter({ hasText: /Relay/ })
      .click();
    await page.getByRole('button', { name: 'Execute' }).click();

    await expect(page.getByText('Order Filled Successfully!')).toBeVisible({ timeout: 180_000 });
  });

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

test.describe('Address menu', () => {
  test('copy address', async ({ page }) => {
    await page.getByTestId('rk-account-button').click();
    await page.getByRole('button', { name: /Copy Address/i }).click();
    const clipboardText = await page.evaluate('navigator.clipboard.readText()');

    expect(clipboardText).toBe('0xc59c92D9d6064464280B621C42A6ECDa0EA2D29b');
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
    await page.getByTestId('input-token-select').click();
    await page.getByTestId('input-token-select-listbox').getByText('USDC').click();
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

test.describe('Demo limits', () => {
  test('shows warning banner on the cross-chain page', async ({ page }) => {
    await expect(page.getByText('This is a demo app for testing and experimentation')).toBeVisible();
  });

  test('disables submit when USDC amount exceeds 100', async ({ page }) => {
    await page.getByTestId('input-token-select').click();
    await page.getByTestId('input-token-select-listbox').getByText('USDC').click();
    await page.getByRole('textbox', { name: 'Amount' }).fill('101');

    const submitBtn = page.getByTestId('submit-button');
    await expect(submitBtn).toBeDisabled();
    await expect(submitBtn).toHaveText('Amount too large for demo');
  });

  test('allows submit when USDC amount is exactly 100', async ({ page }) => {
    await page.getByTestId('input-token-select').click();
    await page.getByTestId('input-token-select-listbox').getByText('USDC').click();
    await page.getByRole('textbox', { name: 'Amount' }).fill('100');

    await expect(page.getByTestId('submit-button')).toBeEnabled();
  });

  test('disables submit in build quote mode too', async ({ page }) => {
    await page.getByRole('button', { name: 'Build Quote' }).click();
    await page.getByTestId('input-token-select').click();
    await page.getByTestId('input-token-select-listbox').getByText('USDC').click();
    await page.getByLabel('You send').fill('200');

    await expect(page.getByTestId('submit-button')).toBeDisabled();
  });
});

test.describe('Mint mockUSDC', () => {
  test('mints and updates balance in UI', async ({ page }) => {
    await page.locator('#output-chain-select').selectOption({ label: 'OP Sepolia' });
    await page.locator('#input-chain-select').selectOption({ label: 'Base Sepolia' });
    await page.getByTestId('input-token-select').click();
    const listbox = page.getByTestId('input-token-select-listbox');
    await listbox.getByText('mockUSDC', { exact: true }).click();

    const maxButton = page.getByTestId('max-balance-button');
    await expect(maxButton).toBeVisible({ timeout: 10_000 });
    const maxText = (await maxButton.textContent()) ?? '';

    // Balance before minting
    const balanceBefore = parseFloat(maxText.replace('Max: ', ''));

    const mintButton = page.getByTestId('mint-button');
    await mintButton.click();
    await expect(mintButton).toHaveText('Minting...', { timeout: 10_000 });
    await expect(mintButton).toHaveText('Mint 100 USDC', { timeout: 30_000 });

    // Balance after minting
    const expectedBalance = balanceBefore + 100;
    await expect(maxButton).toHaveText(`Max: ${expectedBalance}`, { timeout: 10_000 });
  });
});
