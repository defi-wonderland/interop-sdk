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
 * Validates a chain identifier
 * @returns true if the chain is valid, false otherwise
 */
export const isValidChain = (chainType: ChainTypeName, chainReference: string): boolean => {
    switch (chainType) {
        case "eip155":
            if (!chainReference) return false;
            const chainId = Number(chainReference);

            if (isNaN(chainId)) {
                return false;
            }

            return chainIdMap.has(chainId);
        case "solana":
            return true;
        default:
            return false;
    }
};
