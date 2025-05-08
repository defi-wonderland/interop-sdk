import {
    BinaryAddress,
    EncodedAddress,
    EncodedChainReference,
    formatAddress,
    formatChainReference,
    HumanReadableAddress,
    parseBinary,
    parseHumanReadable,
    toBinary,
    toHumanReadable,
} from "../internal.js";

export class InteropAddressProvider {
    private constructor() {} // prevent instantiation

    /**
     * Converts a human-readable address to a binary address
     * @param humanReadableAddress - The human-readable address to convert
     * @returns BinaryAddress - The binary address
     * @example
     * ```ts
     * const binaryAddress = await InteropAddressProvider.humanReadableToBinary("alice.eth@eip155:1#ABCD1234");
     * ```
     */
    public static async humanReadableToBinary(
        humanReadableAddress: string,
    ): Promise<BinaryAddress> {
        const interopAddress = await parseHumanReadable(humanReadableAddress);
        return toBinary(interopAddress) as BinaryAddress;
    }

    /**
     * Converts a binary address to a human-readable address
     * @param binaryAddress - The binary address to convert
     * @returns HumanReadableAddress - The human-readable address
     * @example
     * ```ts
     * const humanReadableAddress = await InteropAddressProvider.binaryToHumanReadable("0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045");
     * ```
     */
    public static binaryToHumanReadable(binaryAddress: string): HumanReadableAddress {
        const interopAddress = parseBinary(binaryAddress as `0x${string}`);
        return toHumanReadable(interopAddress);
    }

    /**
     * Get the chain ID from a binary address
     * @param binaryAddress - The binary address to get the chain ID from
     * @returns The chain ID
     */
    public static getChainId(binaryAddress: string): EncodedChainReference {
        const interopAddress = parseBinary(binaryAddress as `0x${string}`);
        return formatChainReference(interopAddress.chainReference, interopAddress.chainType);
    }

    /**
     * Get the address from a binary address
     * @param binaryAddress - The binary address to get the address from
     * @returns The address
     */
    public static getAddress(binaryAddress: string): EncodedAddress {
        const interopAddress = parseBinary(binaryAddress as `0x${string}`);
        return formatAddress(interopAddress.address, interopAddress.chainType);
    }
}

export const humanReadableToBinary = InteropAddressProvider.humanReadableToBinary;
export const binaryToHumanReadable = InteropAddressProvider.binaryToHumanReadable;
export const getChainId = InteropAddressProvider.getChainId;
export const getAddress = InteropAddressProvider.getAddress;
