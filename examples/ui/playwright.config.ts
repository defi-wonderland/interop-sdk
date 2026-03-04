import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.e2e' });

const anvilUrl = process.env.NEXT_PUBLIC_ANVIL_URL ?? 'http://127.0.0.1:8545';
const anvilPort = Number(new URL(anvilUrl).port) || 8545;
const anvilForkRpc = process.env.ANVIL_FORK_RPC ?? 'https://base-sepolia-rpc.publicnode.com';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        permissions: ['clipboard-read', 'clipboard-write'],
      },
    },
  ],

  webServer: [
    {
      command: `anvil --port ${anvilPort} --fork-url ${anvilForkRpc} --block-time 1 --silent`,
      port: anvilPort,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'pnpm build && pnpm start',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
});
