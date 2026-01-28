import { test, expect } from '@playwright/test';
import { NETWORK_ERROR_MESSAGE } from '../app/utils/address-conversion.js';

test.describe('Error handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/addresses');
    await page.getByRole('button', { name: 'From text' }).click();
  });

  test('displays user-friendly error message on network failure', async ({ page }) => {
    // Abort server action requests to simulate network failure
    await page.route('**/addresses', async (route) => {
      const headers = route.request().headers();
      if (headers['next-action']) {
        return route.abort('failed');
      }
      return route.continue();
    });

    await page.getByRole('textbox', { name: 'Interoperable Name' }).fill('vitalik.eth@eth');
    await page.getByRole('button', { name: 'Convert' }).click();

    const errorContainer = page.getByTestId('error-container');
    await expect(errorContainer).toBeVisible();
    await expect(errorContainer).toContainText(NETWORK_ERROR_MESSAGE);
  });
});
