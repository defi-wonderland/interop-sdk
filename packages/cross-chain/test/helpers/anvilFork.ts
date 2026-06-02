import { spawn } from "child_process";
import type { ChildProcess } from "child_process";
import type { Chain, PublicClient } from "viem";
import { createPublicClient, http } from "viem";
import { afterAll, beforeAll } from "vitest";

import { PublicClientManager } from "../../src/core/utils/publicClientManager.js";

export interface AnvilFork {
    client: PublicClient;
    clientManager: PublicClientManager;
}

const DEFAULT_PORT = 8559;
const FORK_BLOCK_OFFSET = 32n;
const READY_TIMEOUT_MS = 20_000;
const READY_POLL_INTERVAL_MS = 250;
const RPC_MAX_ATTEMPTS = 3;
const RPC_RETRY_BACKOFF_MS = 500;

/**
 * Set up an anvil fork for the current describe block.
 * Returns a ref that gets populated in beforeAll.
 */
export function useAnvilFork(chain: Chain, port = DEFAULT_PORT): { current: AnvilFork | null } {
    const ref: { current: AnvilFork | null } = { current: null };
    let stop: (() => void) | null = null;

    beforeAll(async () => {
        try {
            const result = await startAnvil(chain, port);
            ref.current = { client: result.client, clientManager: result.clientManager };
            stop = result.stop;
        } catch {
            console.warn("anvil not available, skipping fork tests");
        }
    }, 45000);

    afterAll(() => stop?.());

    return ref;
}

async function startAnvil(chain: Chain, port: number): Promise<AnvilFork & { stop: () => void }> {
    const forkUrl = resolveForkUrl(chain);
    const rpcUrl = `http://127.0.0.1:${port}`;
    const forkBlock = await resolveForkBlock(chain, forkUrl);

    const proc = spawn("anvil", [
        "--fork-url",
        forkUrl,
        "--fork-block-number",
        String(forkBlock),
        "--port",
        String(port),
        "--silent",
        "--no-mining",
    ]);

    const client = createPublicClient({ chain, transport: http(rpcUrl) });

    try {
        await waitForAnvilReady(client, proc);
    } catch (error) {
        proc.kill();
        throw error;
    }

    return {
        client,
        clientManager: new PublicClientManager(client),
        stop: () => proc.kill(),
    };
}

function resolveForkUrl(chain: Chain): string {
    return process.env[`FORK_RPC_URL_${chain.id}`] ?? chain.rpcUrls.default.http[0]!;
}

async function resolveForkBlock(chain: Chain, forkUrl: string): Promise<bigint> {
    const upstream = createPublicClient({ chain, transport: http(forkUrl) });
    const latest = await withRpcRetry(() => upstream.getBlockNumber());
    const forkBlock = latest - FORK_BLOCK_OFFSET;

    if (forkBlock <= 0n) {
        throw new Error(`computed fork block ${forkBlock} is invalid (latest=${latest})`);
    }

    return forkBlock;
}

async function waitForAnvilReady(client: PublicClient, proc: ChildProcess): Promise<void> {
    let failure: Error | null = null;
    const onExit = (code: number | null): void => {
        failure = new Error(`anvil exited with code ${code}`);
    };
    const onError = (error: Error): void => {
        failure = error;
    };

    proc.once("exit", onExit);
    proc.once("error", onError);

    try {
        const deadline = Date.now() + READY_TIMEOUT_MS;
        while (Date.now() < deadline) {
            if (failure) throw failure;
            try {
                await client.getBlockNumber();
                return;
            } catch {
                await delay(READY_POLL_INTERVAL_MS);
            }
        }
        throw new Error("anvil did not become ready in time");
    } finally {
        proc.off("exit", onExit);
        proc.off("error", onError);
    }
}

async function withRpcRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= RPC_MAX_ATTEMPTS; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt < RPC_MAX_ATTEMPTS) await delay(RPC_RETRY_BACKOFF_MS * attempt);
        }
    }
    throw lastError;
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
