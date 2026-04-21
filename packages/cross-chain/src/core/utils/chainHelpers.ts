import type { Chain } from "viem";
import { extractChain } from "viem";
import * as viemChains from "viem/chains";

const ALL_VIEM_CHAINS: Chain[] = (Object.values(viemChains) as unknown[]).filter(
    (value): value is Chain =>
        typeof value === "object" &&
        value !== null &&
        typeof (value as Chain).id === "number" &&
        typeof (value as Chain).name === "string" &&
        "rpcUrls" in value,
);

/**
 * Get a chain by its chain ID.
 *
 * Resolves against the full `viem/chains` catalogue, so any chain viem knows
 * works out of the box — no SDK release required to add a new chain.
 *
 * @param chainId - The chain ID to look up
 * @returns The chain configuration
 * @throws {Error} If the chain ID is not known to viem
 *
 * @example
 * ```typescript
 * const mainnet = getChainById(1);
 * const sepolia = getChainById(11155111);
 * ```
 */
export function getChainById(chainId: number): Chain {
    const chain = extractChain({
        chains: ALL_VIEM_CHAINS,
        id: chainId as Chain["id"],
    });
    if (!chain) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    return chain;
}
