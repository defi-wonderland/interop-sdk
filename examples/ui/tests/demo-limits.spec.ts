import { test, expect } from '@playwright/test';

const MOCK_TOKENS = [
  { chainId: 11155111, address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', symbol: 'USDC', decimals: 6 },
  { chainId: 84532, address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', symbol: 'USDC', decimals: 6 },
  { chainId: 421614, address: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', symbol: 'USDC', decimals: 6 },
];

test.beforeEach(async ({ page, context }) => {
  await context.route('**/api/swap/tokens**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_TOKENS),
    });
  });

  await context.route('**/oif-api.openzeppelin.com/**', (route) => route.abort('blockedbyclient'));

  await page.goto('/cross-chain?testnet=true');
  await expect(page.getByTestId('input-token-select')).toBeVisible({ timeout: 15000 });
});

test.describe('Demo banner', () => {
  test('shows warning banner on the cross-chain page', async ({ page }) => {
    await expect(page.getByText('This is a demo app for testing and experimentation')).toBeVisible();
  });
});

test.describe('Demo amount limits', () => {
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
