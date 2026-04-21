import type { Chain } from "viem";
import { extractChain } from "viem";
import * as viemChains from "viem/chains";

/**
 * Get a chain by its chain ID.
 *
 * Looks up the chain in viem's catalogue, so any chain viem ships with is
 * available without adding it to the SDK.
 *
 * @param chainId - The chain ID to look up
 * @returns The chain configuration
 * @throws {Error} If viem does not know the chain ID
 *
 * @example
 * ```typescript
 * const mainnet = getChainById(1);
 * const sepolia = getChainById(11155111);
 * ```
 */
export function getChainById(chainId: number): Chain {
    const chain = extractChain({
        chains: Object.values(viemChains) as Chain[],
        id: chainId as Chain["id"],
    });
    if (!chain) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    return chain;
}
