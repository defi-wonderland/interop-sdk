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
