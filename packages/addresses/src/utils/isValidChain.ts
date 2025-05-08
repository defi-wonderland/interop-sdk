import { Chain } from "viem";
import * as chains from "viem/chains";

import { ChainTypeName } from "../internal.js";

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

            const chainValues = Object.values(chains) as unknown as Chain[];
            return chainValues.some((chain) => chain.id === chainId);
        case "solana":
            return true;
        default:
            return false;
    }
};
