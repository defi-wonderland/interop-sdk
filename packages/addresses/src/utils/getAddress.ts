import { BinaryAddress, EncodedAddress, formatAddress, parseBinary } from "../internal.js";

/**
 * Get the address from an InteropAddress
 * @param binaryAddress - The binary address to get the address from
 * @returns The address
 */
export function getAddress(binaryAddress: BinaryAddress): EncodedAddress {
    const interopAddress = parseBinary(binaryAddress);
    return formatAddress(interopAddress.address, interopAddress.chainType);
}
