import { test, expect } from '@playwright/test';

const USER_FRIENDLY_ERROR_MESSAGE = 'please try again or check your connection';

test.describe('Error handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/addresses');
    await page.getByRole('button', { name: 'From text' }).click();
  });

  test('displays user-friendly error message on network failure', async ({ page }) => {
    await page.route('**/*', (route) => {
      const postData = route.request().postData();
      // Reject all rpc calls
      if (postData?.includes('eth_call')) {
        return route.abort('failed');
      }
      return route.continue();
    });

    await page.getByRole('textbox', { name: 'Human-Readable Address' }).fill('vitalik.eth@eth');
    await page.getByRole('button', { name: 'Convert' }).click();

    const errorContainer = page.getByTestId('error-container');
    await expect(errorContainer).toBeVisible();
    await expect(errorContainer).toContainText(USER_FRIENDLY_ERROR_MESSAGE);
  });
});
