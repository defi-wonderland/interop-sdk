import { toHex } from "viem";

import type { HumanReadableAddress, InteropAddress } from "../internal.js";
import {
    calculateChecksum,
    CHAIN_TYPE_VALUE_TO_NAME,
    ChainTypeValue,
    formatAddress,
    formatChainReference,
    validateInteropAddress,
} from "../internal.js";

/**
 * Converts an InteropAddress to a human-readable string format
 * @param addressData - The address data to convert
 * @returns A human-readable string representation of the address
 */
export const toHumanReadable = async (
    addressData: InteropAddress,
): Promise<HumanReadableAddress> => {
    const { chainType, chainReference, address } = validateInteropAddress(addressData);
    const formattedAddress = address.length
        ? await formatAddress(address, chainType, { acceptENS: true })
        : "";
    const chainTypeHex = toHex(chainType);
    const namespace = CHAIN_TYPE_VALUE_TO_NAME[chainTypeHex as ChainTypeValue];

    const checksum = calculateChecksum(addressData);
    const chainId = chainReference ? formatChainReference(chainReference, chainType) : "";

    return `${formattedAddress}@${namespace}:${chainId}#${checksum}`;
};
