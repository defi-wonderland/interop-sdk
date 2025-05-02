import { keccak256 } from "viem";

import type { Checksum } from "../internal.js";
import { InteropAddress, toBinary } from "../internal.js";
import { validateInteropAddress } from "./validateInteropAddress.js";

/**
 * Calculates a checksum for an InteropAddress as per ERC-7930
 * @param addressData - The address data to calculate checksum for
 * @returns A 8-character uppercase hex string checksum as per ERC-7930
 */
export const calculateChecksum = (addressData: InteropAddress): Checksum => {
    validateInteropAddress(addressData);
    const binaryAddress = toBinary(addressData);
    const hash = keccak256(`0x${binaryAddress.slice(6)}`);

    return hash.slice(2, 10).toUpperCase() as Checksum;
};
