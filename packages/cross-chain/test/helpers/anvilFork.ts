import { spawn } from "child_process";
import type { Chain, PublicClient } from "viem";
import { createPublicClient, http } from "viem";
import { afterAll, beforeAll } from "vitest";

import { PublicClientManager } from "../../src/core/utils/publicClientManager.js";

export interface AnvilFork {
    client: PublicClient;
    clientManager: PublicClientManager;
}

/**
 * Set up an anvil fork for the current describe block.
 * Returns a ref that gets populated in beforeAll.
 */
export function useAnvilFork(chain: Chain, port = 8559): { current: AnvilFork | null } {
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
    }, 15000);

    afterAll(() => stop?.());

    return ref;
}

function startAnvil(chain: Chain, port: number): Promise<AnvilFork & { stop: () => void }> {
    const forkUrl = chain.rpcUrls.default.http[0]!;
    const rpcUrl = `http://127.0.0.1:${port}`;

    return new Promise((resolve, reject) => {
        const proc = spawn("anvil", [
            "--fork-url",
            forkUrl,
            "--port",
            String(port),
            "--silent",
            "--no-mining",
        ]);

        proc.on("error", reject);
        proc.on("exit", (code) => reject(new Error(`anvil exited with code ${code}`)));

        setTimeout(() => {
            const client = createPublicClient({ chain, transport: http(rpcUrl) });
            resolve({
                client,
                clientManager: new PublicClientManager(client),
                stop: () => proc.kill(),
            });
        }, 4000);
    });
}
