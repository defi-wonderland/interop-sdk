import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.goto('/');
});

test('"From text" tab - Convert address', async ({ page }) => {
    await page.getByRole('button', { name: 'From text' }).click();
    await page.getByRole('textbox', { name: 'Human-Readable Address' }).fill('vitalik.eth@eth');
    await page.getByRole('button', { name: 'Convert' }).click();

    await expect(page.getByRole('heading', { name: 'Human-Readable Format' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Binary Format' })).toBeVisible();
});

test('"From text" - Use example chips', async ({ page }) => {
    const exampleChips: string[] = ['vitalik.eth (Ethereum Mainnet)', 'nick.eth (Arbitrum One)', '0x8335...A02913 (Base)'];
    await page.getByRole('button', { name: 'From text' }).click();
    for (const locator of exampleChips) {
        await page.getByRole('button', { name: locator }).click();
        await page.getByRole('button', { name: 'Convert' }).click();

        await expect(page.getByRole('heading', { name: 'Human-Readable Format' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Binary Format' })).toBeVisible();
    }
});
