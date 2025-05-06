import { EncodedChainReference, formatChainReference, InteropAddress } from "../internal.js";

/**
 * Get the chain ID from an InteropAddress
 * @param interopAddress - The InteropAddress to get the chain ID from
 * @returns The chain ID
 */
export function getChainId(interopAddress: InteropAddress): EncodedChainReference {
    return formatChainReference(interopAddress.chainReference, interopAddress.chainType);
}
