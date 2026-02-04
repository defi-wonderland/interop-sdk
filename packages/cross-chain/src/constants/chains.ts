import { arbitrum, arbitrumSepolia, base, baseSepolia, sepolia } from "viem/chains";

/**
 * Mainnet chains
 */
export const MAINNET_CHAINS = [base, arbitrum] as const;

/**
 * Testnet chains
 */
export const TESTNET_CHAINS = [sepolia, baseSepolia, arbitrumSepolia] as const;

/**
 * Supported chains for cross-chain operations
 * Includes both mainnet and testnet networks
 */
export const SUPPORTED_CHAINS = [...MAINNET_CHAINS, ...TESTNET_CHAINS] as const;

/**
 * Chain types supported by EIP-7930 / CAIP-350
 * These match the chain type names used by @wonderland/interop-addresses
 */
export type ChainType = "eip155" | "solana";

/**
 * Known non-EVM chain IDs
 * Maps chain IDs to their chain type for networks that don't use the EIP-155 standard
 *
 * Chain ID sources:
 * - Solana: CAIP-2 identifier (uses namespace "solana" and genesis hash-based reference)
 *   The chain ID 34268394551451 is derived from Solana's CAIP-2 specification
 */
export const NON_EVM_CHAIN_IDS: ReadonlyMap<number, ChainType> = new Map([
    // Solana Mainnet - CAIP-2: solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp
    [34268394551451, "solana"],
]);
