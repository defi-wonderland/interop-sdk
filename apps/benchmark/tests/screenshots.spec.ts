import { test, expect, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RUN = process.env.SCREENSHOTS === '1';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_DIR = process.env.SCREENSHOT_DIR ?? path.resolve(__dirname, '../../../bench-shots');

const VIEWPORTS = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, ua: undefined as string | undefined, isMobile: false },
  { name: 'mobile', viewport: devices['iPhone 13'].viewport, ua: devices['iPhone 13'].userAgent, isMobile: true },
];

const SCENARIOS = ['initial', 'rerun', 'preset-10k', 'from-ethereum', 'swap-arrow'];

test.describe.configure({ mode: 'serial' });

for (const v of VIEWPORTS) {
  test(`screenshots ${v.name}`, async ({ browser }) => {
    test.skip(!RUN, 'set SCREENSHOTS=1 to run');
    const ctx = await browser.newContext({
      viewport: v.viewport,
      userAgent: v.ua,
      isMobile: v.isMobile,
      hasTouch: v.isMobile,
      deviceScaleFactor: v.isMobile ? 3 : 1,
    });
    const page = await ctx.newPage();
    page.setDefaultTimeout(30_000);

    // --- initial ---
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForSelector('section[aria-label="live quote race results"]');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT_DIR, v.name, 'initial.png'), fullPage: true });

    // --- rerun ---
    const rerun = page.getByRole('button', { name: /re-run quote race/i });
    await rerun.click();
    await page.waitForTimeout(500); // capture mid-race querying state too if visible
    await page.screenshot({ path: path.join(OUT_DIR, v.name, 'rerun-mid.png'), fullPage: true });
    // wait for race to settle (no querying pills) up to 15s
    await page
      .waitForFunction(
        () => !document.querySelector('[aria-label="live quote race results"] .animate-pulse'),
        null,
        { timeout: 16_000 },
      )
      .catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, v.name, 'rerun.png'), fullPage: true });

    // --- preset $10k ---
    await page.getByRole('button', { name: '$10k', exact: true }).click();
    await page.waitForTimeout(500);
    await page
      .waitForFunction(
        () => !document.querySelector('[aria-label="live quote race results"] .animate-pulse'),
        null,
        { timeout: 16_000 },
      )
      .catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, v.name, 'preset-10k.png'), fullPage: true });

    // --- from dropdown -> ethereum ---
    const fromBtn = page.locator('button[aria-label^="from:"]').first();
    await fromBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT_DIR, v.name, 'from-dropdown-open.png'), fullPage: true });
    await page.getByRole('option', { name: /ethereum/i }).first().click();
    await page.waitForTimeout(500);
    await page
      .waitForFunction(
        () => !document.querySelector('[aria-label="live quote race results"] .animate-pulse'),
        null,
        { timeout: 16_000 },
      )
      .catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, v.name, 'from-ethereum.png'), fullPage: true });

    // --- swap arrow ---
    const swap = page.locator('button[aria-label*="swap" i]').first();
    if (await swap.count()) {
      await swap.click();
    } else {
      await page.locator('button:has-text("↔"), button:has-text("⇄")').first().click().catch(() => {});
    }
    await page.waitForTimeout(500);
    await page
      .waitForFunction(
        () => !document.querySelector('[aria-label="live quote race results"] .animate-pulse'),
        null,
        { timeout: 16_000 },
      )
      .catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, v.name, 'swap-arrow.png'), fullPage: true });

    await ctx.close();
    expect(true).toBeTruthy();
  });
}

// reference the const so TS doesn't complain about unused
void SCENARIOS;
