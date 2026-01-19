import bs58 from "bs58";
import { Chain } from "viem";
import * as chains from "viem/chains";

import { CHAIN_TYPE, ChainTypeName } from "../constants/interopAddress.js";

/**
 * A map of chain IDs to chains
 */
const chainIdMap = new Map<number, Chain>();
(Object.values(chains) as Chain[]).forEach((chain) => {
    chainIdMap.set(chain.id, chain);
});

/**
 * Validates that a chain type is a supported CAIP profile.
 *
 * @param chainType - The chain type to validate (e.g., "eip155", "solana")
 * @returns true if the chain type is a supported CAIP profile, false otherwise
 */
export const isValidChainType = (chainType: string): chainType is ChainTypeName => {
    return chainType in CHAIN_TYPE;
};

/**
 * Validates a chain identifier for a given chain type.
 *
 * For EIP-155, validates that the chain reference is a positive numeric chain ID.
 * For Solana, validates that the chain reference is a valid base58-encoded string.
 *
 * @param chainType - The chain type (e.g., "eip155", "solana")
 * @param chainReference - The chain reference to validate
 * @returns true if the chain identifier is structurally valid, false otherwise
 */
export const isValidChain = (chainType: ChainTypeName, chainReference: string): boolean => {
    if (!chainReference) {
        return false;
    }

    switch (chainType) {
        case "eip155": {
            const chainId = Number(chainReference);

            if (!Number.isInteger(chainId) || chainId <= 0) {
                return false;
            }

            return true;
        }
        case "solana": {
            // Validate that the chain reference is a valid base58-encoded string
            try {
                const decoded = bs58.decode(chainReference);
                // Solana cluster IDs are typically 32 bytes
                return decoded.length > 0 && decoded.length <= 32;
            } catch {
                return false;
            }
        }
        default:
            return false;
    }
};

/**
 * Checks whether a given EVM chain ID corresponds to a chain known to `viem/chains`.
 * This is used for ENS resolution, where we only use chain-specific coin types for
 * known chains and otherwise fall back to mainnet.
 */
export const isViemChainId = (chainId: number): boolean => {
    return chainIdMap.has(chainId);
};
