import {
    BinaryAddress,
    EncodedChainReference,
    formatChainReference,
    parseBinary,
} from "../internal.js";

/**
 * Get the chain ID from an InteropAddress
 * @param binaryAddress - The binary address to get the chain ID from
 * @returns The chain ID
 */
export function getChainId(binaryAddress: BinaryAddress): EncodedChainReference {
    const interopAddress = parseBinary(binaryAddress);
    return formatChainReference(interopAddress.chainReference, interopAddress.chainType);
}
