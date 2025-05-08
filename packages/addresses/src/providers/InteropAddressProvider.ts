import {
    BinaryAddress,
    EncodedChainReference,
    formatAddress,
    formatChainReference,
    parseBinary,
} from "../internal.js";

export class InteropAddressProvider {
    private constructor() {} // prevent instantiation

    // TODO: Implement
    public static humanReadableToBinary(): void {}

    // TODO: Implement
    public static binaryToHumanReadable(): void {}

    /**
     * Get the chain ID from a binary address
     * @param binaryAddress - The binary address to get the chain ID from
     * @returns The chain ID
     */
    public static getChainId(binaryAddress: BinaryAddress): EncodedChainReference {
        const interopAddress = parseBinary(binaryAddress);
        return formatChainReference(interopAddress.chainReference, interopAddress.chainType);
    }

    /**
     * Get the address from a binary address
     * @param binaryAddress - The binary address to get the address from
     * @returns The address
     */
    public static getAddress(binaryAddress: BinaryAddress): string {
        const interopAddress = parseBinary(binaryAddress);
        return formatAddress(interopAddress.address, interopAddress.chainType);
    }
}

export const humanReadableToBinary = InteropAddressProvider.humanReadableToBinary;
export const binaryToHumanReadable = InteropAddressProvider.binaryToHumanReadable;
export const getChainId = InteropAddressProvider.getChainId;
export const getAddress = InteropAddressProvider.getAddress;
