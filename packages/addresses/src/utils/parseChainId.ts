import type { Hex } from "viem";

import { decodeAddress } from "../address/index.js";

/**
 * Extracts a numeric chain ID from an ERC-7930 interoperable address.
 * Returns null if the address can't be decoded or the chain reference isn't numeric.
 */
export function parseChainId(interoperableAddress: Hex): number | null {
    try {
        const chainId = Number(decodeAddress(interoperableAddress).chainReference);
        return isNaN(chainId) ? null : chainId;
    } catch {
        return null;
    }
}
