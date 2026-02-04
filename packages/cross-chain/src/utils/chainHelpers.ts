import { Chain } from "viem";

import { ChainType, NON_EVM_CHAIN_IDS, SUPPORTED_CHAINS } from "../internal.js";

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
 * Determine the chain type for a given chain ID
 *
 * This function maps chain IDs to their corresponding chain type
 * as defined by EIP-7930 / CAIP-350. Most chains use EIP-155 (EVM-compatible),
 * but some chains like Solana have their own chain type.
 *
 * @param chainId - The chain ID to look up
 * @returns The chain type ("eip155", "solana", etc.)
 *
 * @example
 * ```typescript
 * getChainType(1);              // "eip155" (Ethereum mainnet)
 * getChainType(34268394551451); // "solana" (Solana mainnet)
 * ```
 */
export function getChainType(chainId: number): ChainType {
    return NON_EVM_CHAIN_IDS.get(chainId) ?? "eip155";
}

/**
 * Check if a chain ID corresponds to an EVM-compatible chain
 *
 * @param chainId - The chain ID to check
 * @returns True if the chain is EVM-compatible (EIP-155)
 *
 * @example
 * ```typescript
 * isEvmChain(1);              // true (Ethereum)
 * isEvmChain(34268394551451); // false (Solana)
 * ```
 */
export function isEvmChain(chainId: number): boolean {
    return getChainType(chainId) === "eip155";
}
