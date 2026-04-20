#!/usr/bin/env node
/**
 * Boots an anvil fork pinned to a concrete block number.
 *
 * The e2e Playwright suite previously forked at `latest` against a public
 * full-node RPC, which only retains ~128 blocks of historical state. Anvil's
 * boot sequence makes two calls (resolve `latest`, then read the foundry
 * default account state); if the pruning window advanced between them, the
 * second call returned `historical state not available` and the webServer
 * exited 1 before any test ran.
 *
 * Pinning the fork block to `latest - ANVIL_FORK_BLOCK_OFFSET` (default 32)
 * collapses that race into a single deterministic call while staying well
 * inside the RPC's retention window — no archive endpoint / secret required.
 */

import { spawn } from 'node:child_process';

const DEFAULT_FORK_RPC = 'https://base-sepolia-rpc.publicnode.com';
const DEFAULT_PORT = '8545';
const DEFAULT_BLOCK_OFFSET = 32;
const BLOCK_NUMBER_TIMEOUT_MS = 10_000;

/**
 * @param {string} rpcUrl
 * @returns {Promise<number>}
 */
async function fetchLatestBlockNumber(rpcUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BLOCK_NUMBER_TIMEOUT_MS);

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_blockNumber',
        params: [],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`RPC responded with HTTP ${response.status}`);
    }

    const payload = await response.json();

    if (payload.error) {
      throw new Error(`RPC error: ${payload.error.message ?? JSON.stringify(payload.error)}`);
    }

    const blockNumber = Number.parseInt(payload.result, 16);

    if (!Number.isFinite(blockNumber) || blockNumber <= 0) {
      throw new Error(`Invalid block number from RPC: ${payload.result}`);
    }

    return blockNumber;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * @param {{ rpcUrl: string, port: string, offset: number, explicitBlock: number | null }} config
 * @returns {Promise<number>}
 */
async function resolveForkBlock({ rpcUrl, offset, explicitBlock }) {
  if (explicitBlock !== null) {
    console.log(`[anvil-fork] using explicit fork block ${explicitBlock}`);
    return explicitBlock;
  }

  const latestBlock = await fetchLatestBlockNumber(rpcUrl);
  const forkBlock = latestBlock - offset;

  if (forkBlock <= 0) {
    throw new Error(`Computed fork block ${forkBlock} is invalid (latest=${latestBlock}, offset=${offset})`);
  }

  console.log(`[anvil-fork] forking ${rpcUrl} at block ${forkBlock} (latest=${latestBlock}, offset=${offset})`);
  return forkBlock;
}

/**
 * @param {{ rpcUrl: string, port: string, forkBlock: number }} config
 */
function spawnAnvil({ rpcUrl, port, forkBlock }) {
  const anvilArgs = [
    '--port',
    port,
    '--fork-url',
    rpcUrl,
    '--fork-block-number',
    String(forkBlock),
    '--block-time',
    '1',
    '--silent',
  ];

  const child = spawn('anvil', anvilArgs, { stdio: 'inherit' });

  child.on('error', (error) => {
    console.error(`[anvil-fork] failed to spawn anvil: ${error.message}`);
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    process.exit(code ?? (signal ? 1 : 0));
  });

  const forwardSignal = (signal) => {
    if (!child.killed) child.kill(signal);
  };
  process.on('SIGINT', () => forwardSignal('SIGINT'));
  process.on('SIGTERM', () => forwardSignal('SIGTERM'));
}

async function main() {
  const rpcUrl = process.env.ANVIL_FORK_RPC ?? DEFAULT_FORK_RPC;
  const port = process.env.ANVIL_PORT ?? DEFAULT_PORT;
  const offset = Number.parseInt(process.env.ANVIL_FORK_BLOCK_OFFSET ?? String(DEFAULT_BLOCK_OFFSET), 10);

  if (!Number.isFinite(offset) || offset < 0) {
    throw new Error(
      `ANVIL_FORK_BLOCK_OFFSET must be a non-negative integer, got "${process.env.ANVIL_FORK_BLOCK_OFFSET}"`,
    );
  }

  const explicitBlockEnv = process.env.ANVIL_FORK_BLOCK;
  const explicitBlock = explicitBlockEnv ? Number.parseInt(explicitBlockEnv, 10) : null;

  if (explicitBlock !== null && (!Number.isFinite(explicitBlock) || explicitBlock <= 0)) {
    throw new Error(`ANVIL_FORK_BLOCK must be a positive integer, got "${explicitBlockEnv}"`);
  }

  const forkBlock = await resolveForkBlock({ rpcUrl, port, offset, explicitBlock });
  spawnAnvil({ rpcUrl, port, forkBlock });
}

main().catch((error) => {
  console.error(`[anvil-fork] ${error.message}`);
  process.exit(1);
});
