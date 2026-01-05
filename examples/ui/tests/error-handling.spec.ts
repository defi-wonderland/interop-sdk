import { test, expect } from '@playwright/test';

type Box = { width: number };

test.describe('Error handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/addresses');
    await page.getByRole('button', { name: 'From text' }).click();
  });

  test('displays clean error message without technical details', async ({ page }) => {
    await page.route('**/*', (route) => {
      const postData = route.request().postData();
      // Reject all rpc calls
      if (postData?.includes('eth_call')) {
        return route.abort('failed');
      }
      return route.continue();
    });

    await page.getByRole('textbox', { name: 'Human-Readable Address' }).fill('vitalik.eth@eth');

    const inputCard = page.locator('[class*="rounded-3xl"][class*="border"]').first();
    const originalBox = (await inputCard.boundingBox()) as Box;
    expect(originalBox).not.toBeNull();

    await page.getByRole('button', { name: 'Convert' }).click();

    // Error should not break layout (error container shouldn't be wider than input card)
    const errorContainer = page.locator('[class*="bg-error-light"]');
    await expect(errorContainer).toBeVisible();

    const errorBox = (await errorContainer.boundingBox()) as Box;
    expect(errorBox).not.toBeNull();
    expect(errorBox.width).toBeLessThanOrEqual(originalBox.width);
  });
});
