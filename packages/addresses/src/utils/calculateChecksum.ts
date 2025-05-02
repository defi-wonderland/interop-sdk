import { keccak256, pad, toHex } from "viem";

import { InteropAddress } from "../internal.js";
import { validateInteropAddress } from "./validateInteropAddress.js";

/**
 * Calculates a checksum for an InteropAddress
 * @param addressData - The address data to calculate checksum for
 * @returns An 8-character uppercase hex string representing the checksum
 */
export const calculateChecksum = (addressData: InteropAddress): string => {
    const { chainType, chainReference, address } = validateInteropAddress(addressData);
    const chainTypeHex = toHex(chainType).slice(2);
    const chainReferenceLength = chainReference
        ? pad(toHex(chainReference.length), { size: 1 }).slice(2)
        : "";
    const chainReferenceHex = chainReference ? toHex(chainReference).slice(2) : "";
    const addressLength = pad(toHex(address.length), { size: 1 }).slice(2);
    const addressHex = address ? toHex(address).slice(2) : "";

    const binaryAddress = `${chainTypeHex}${chainReferenceLength}${chainReferenceHex}${addressLength}${addressHex}`;
    const hash = keccak256(`0x${binaryAddress}`);
    return hash.slice(2, 10).toUpperCase();
};
