import { test, expect } from '@playwright/test';

/**
 * Mock OIF solver response including OP Sepolia and Base Sepolia USDC.
 * The mint button only appears for tokens with the 'oif' provider.
 */
const MOCK_OIF_SOLVER_RESPONSE = {
  supportedAssets: {
    assets: [
      { address: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7', chainId: 11155420, symbol: 'USDC', decimals: 6 },
      { address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', chainId: 84532, symbol: 'USDC', decimals: 6 },
    ],
  },
};

test.describe('Mint mockUSDC', () => {
  test.beforeEach(async ({ page, context }) => {
    // Mock OIF solver discovery to include OP Sepolia and Base Sepolia
    await context.route('**/oif-api.openzeppelin.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_OIF_SOLVER_RESPONSE),
      });
    });

    await page.goto('/cross-chain?testnet=true');
  });

  test('mints and updates balance in UI', async ({ page }) => {
    // Wait for asset discovery to populate chain selects
    await expect(page.locator('#output-chain-select > option')).not.toHaveCount(0, { timeout: 15_000 });

    await page.locator('#output-chain-select').selectOption({ label: 'OP Sepolia' });
    await page.locator('#input-chain-select').selectOption({ label: 'Base Sepolia' });

    await page.getByTestId('input-token-select').click();
    const listbox = page.getByTestId('input-token-select-listbox');
    await listbox.getByText('USDC').last().click();

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
