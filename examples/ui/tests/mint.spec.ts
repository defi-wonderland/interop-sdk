import { test, expect } from '@playwright/test';

test.describe('Mint mockUSDC', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cross-chain?testnet=true');
  });

  test('mints and updates balance in UI', async ({ page }) => {
    await expect(page.getByRole('textbox', { name: 'Amount' })).toBeVisible({ timeout: 15_000 });

    await page.locator('#output-chain-select').selectOption({ label: 'OP Sepolia' });
    await page.locator('#input-chain-select').selectOption({ label: 'Base Sepolia' });

    await page.getByTestId('input-token-select').click();
    const listbox = page.getByTestId('input-token-select-listbox');
    await listbox.getByText('USDC').last().click();

    // Balance before minting
    const maxButton = page.getByTestId('max-balance-button');
    await expect(maxButton).toContainText('0', { timeout: 10_000 });

    const mintButton = page.getByTestId('mint-button');
    await mintButton.click();
    await expect(mintButton).toContainText('Minting...');
    await expect(mintButton).toContainText('Mint', { timeout: 30_000 });

    // Balance after minting
    await expect(maxButton).toContainText('100', { timeout: 10_000 });
  });
});
