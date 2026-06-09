import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('from chain picker opens a listbox and updates the trigger', async ({ page }) => {
  const trigger = page.getByRole('button', { name: /^route from chain:/i });
  await trigger.click();
  const listbox = page.getByRole('listbox', { name: 'route from chain' });
  await expect(listbox).toBeVisible();
  await listbox.getByRole('option', { name: 'ethereum' }).click();
  await expect(trigger).toHaveAccessibleName(/route from chain: ethereum/i);
});

test('swap chains arrow flips from and to', async ({ page }) => {
  const fromTrigger = page.getByRole('button', { name: /^route from chain:/i });
  const toTrigger = page.getByRole('button', { name: /^route to chain:/i });

  const initialFromName = await fromTrigger.getAttribute('aria-label');
  const initialToName = await toTrigger.getAttribute('aria-label');

  await page.getByRole('button', { name: 'swap chains' }).click();

  await expect(fromTrigger).toHaveAttribute('aria-label', initialToName!.replace('route to chain:', 'route from chain:'));
  await expect(toTrigger).toHaveAttribute('aria-label', initialFromName!.replace('route from chain:', 'route to chain:'));
});

test('from chain options exclude the current to chain', async ({ page }) => {
  const toTrigger = page.getByRole('button', { name: /^route to chain:/i });
  const toLabel = await toTrigger.getAttribute('aria-label');
  const toChainName = toLabel!.replace('route to chain: ', '');

  await page.getByRole('button', { name: /^route from chain:/i }).click();
  const listbox = page.getByRole('listbox', { name: 'route from chain' });
  await expect(listbox).toBeVisible();
  await expect(listbox.getByRole('option', { name: toChainName })).toHaveCount(0);
});
