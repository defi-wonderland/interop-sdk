import { Chain } from "viem";

import { SUPPORTED_CHAINS } from "../internal.js";

/**
 * Get a supported chain by its chain ID
 *
 * @param chainId - The chain ID to look up
 * @returns The chain configuration
 * @throws {Error} If the chain ID is not supported
 *
 * @example
 * ```typescript
 * const sepoliaChain = getChainById(11155111);
 * ```
 */
export function getChainById(chainId: number): Chain {
    const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId);
    if (!chain) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    return chain;
}
