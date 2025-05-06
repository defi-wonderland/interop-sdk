import { EncodedAddress, formatAddress, InteropAddress } from "../internal.js";

/**
 * Get the address from an InteropAddress
 * @param interopAddress - The InteropAddress to get the address from
 * @returns The address
 */
export function getAddress(interopAddress: InteropAddress): EncodedAddress {
    return formatAddress(interopAddress.address, interopAddress.chainType);
}
