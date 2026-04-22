import type { Chain } from "viem";
import * as viemChains from "viem/chains";

const ALL_VIEM_CHAINS: readonly Chain[] = Object.values(viemChains) as Chain[];

/**
 * Resolves a chain configuration by its chain ID against viem's catalogue.
 *
 * The SDK does not curate a supported-chain list — any chain viem ships with
 * is available, and support for bridging is decided by the registered
 * providers at runtime.
 *
 * @param chainId - The chain ID to look up.
 * @returns The matching viem {@link Chain}.
 * @throws {Error} If viem has no record of the chain ID.
 *
 * @example
 * ```typescript
 * const mainnet = getChainById(1);
 * const sepolia = getChainById(11155111);
 * ```
 */
export function getChainById(chainId: number): Chain {
    const chain = ALL_VIEM_CHAINS.find((c) => c.id === chainId);
    if (!chain) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    return chain;
}
