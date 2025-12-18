import { Chain } from "viem";
import * as chains from "viem/chains";

import { ChainTypeName } from "../internal.js";

/**
 * A map of chain IDs to chains
 */
const chainIdMap = new Map<number, Chain>();
(Object.values(chains) as Chain[]).forEach((chain) => {
    chainIdMap.set(chain.id, chain);
});

/**
 * Validates a chain identifier.
 *
 * For EIP-155, this now accepts any positive numeric chain ID (not restricted to
 * the set of chains exported by `viem/chains`), so that future or custom chains
 * are considered valid as long as the identifier is numeric.
 *
 * @returns true if the chain identifier is structurally valid, false otherwise
 */
export const isValidChain = (chainType: ChainTypeName, chainReference: string): boolean => {
    switch (chainType) {
        case "eip155": {
            if (!chainReference) return false;
            const chainId = Number(chainReference);

            if (!Number.isInteger(chainId) || chainId <= 0) {
                return false;
            }

            return true;
        }
        case "solana":
            return true;
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
