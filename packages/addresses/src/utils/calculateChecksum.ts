import { keccak256, pad, toHex } from "viem";

import type { Checksum } from "../internal.js";
import { checksumSchema, InteropAddress } from "../internal.js";
import { validateInteropAddress } from "./validateInteropAddress.js";

/**
 * Calculates a checksum for an InteropAddress as per ERC-7930
 * @param addressData - The address data to calculate checksum for
 * @returns A 8-character uppercase hex string checksum as per ERC-7930
 */
export const calculateChecksum = (addressData: InteropAddress): Checksum => {
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
    return checksumSchema.parse(hash.slice(2, 10).toUpperCase());
};
