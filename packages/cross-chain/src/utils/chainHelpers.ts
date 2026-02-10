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

/**
 * Convert a numeric EVM chain ID to a CAIP-2 chain identifier.
 *
 * CAIP-2 defines a standard format for blockchain identifiers:
 * `namespace:reference` (e.g., "eip155:1" for Ethereum mainnet).
 *
 * @see https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md
 *
 * @param chainId - Numeric chain ID (e.g. 1, 42161)
 * @param namespace - Chain namespace (default: "eip155" for EVM chains)
 * @returns CAIP-2 chain identifier (e.g. "eip155:1")
 *
 * @example
 * ```typescript
 * toCaip2ChainId(1)      // "eip155:1"
 * toCaip2ChainId(42161)  // "eip155:42161"
 * ```
 */
export function toCaip2ChainId(chainId: number, namespace: string = "eip155"): string {
    return `${namespace}:${chainId}`;
}
