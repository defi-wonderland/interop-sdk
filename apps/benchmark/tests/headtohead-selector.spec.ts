import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('asset picker opens a listbox and updates the trigger', async ({ page }) => {
  const trigger = page.getByRole('button', { name: /^asset:/i });
  await trigger.click();
  const listbox = page.getByRole('listbox', { name: 'asset' });
  await expect(listbox).toBeVisible();
  await listbox.getByRole('option', { name: 'WETH' }).click();
  await expect(trigger).toHaveAccessibleName(/asset: WETH/i);
});

test('swap chains arrow flips from and to', async ({ page }) => {
  const fromTrigger = page.getByRole('button', { name: /^from chain:/i });
  const toTrigger = page.getByRole('button', { name: /^to chain:/i });

  const initialFromName = await fromTrigger.getAttribute('aria-label');
  const initialToName = await toTrigger.getAttribute('aria-label');

  await page.getByRole('button', { name: 'swap chains' }).click();

  await expect(fromTrigger).toHaveAttribute('aria-label', initialToName!.replace('to chain:', 'from chain:'));
  await expect(toTrigger).toHaveAttribute('aria-label', initialFromName!.replace('from chain:', 'to chain:'));
});

test('from chain options exclude the current to chain', async ({ page }) => {
  const toTrigger = page.getByRole('button', { name: /^to chain:/i });
  const toLabel = await toTrigger.getAttribute('aria-label');
  const toChainName = toLabel!.replace('to chain: ', '');

  await page.getByRole('button', { name: /^from chain:/i }).click();
  const listbox = page.getByRole('listbox', { name: 'from chain' });
  await expect(listbox).toBeVisible();
  await expect(listbox.getByRole('option', { name: toChainName })).toHaveCount(0);
});
