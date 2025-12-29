import { Hex } from "viem";

import {
    BinaryAddress,
    buildInteropAddress,
    calculateChecksum,
    ChainTypeName,
    Checksum,
    EncodedAddress,
    EncodedChainReference,
    formatAddress,
    formatChainReference,
    HumanReadableAddress,
    InteropAddress,
    InteropAddressFields,
    isBinaryInteropAddress,
    isHumanReadableInteropAddress,
    isInteropAddress,
    parseBinary,
    parseHumanReadable,
    ParseHumanReadableOptions,
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
     * Converts a binary address to a human-readable address.
     * @param binaryAddress - The binary address to convert.
     * @returns HumanReadableAddress - The human-readable address.
     * @example
     * ```ts
     * const humanReadableAddress =
     *   InteropAddressProvider.binaryToHumanReadable("0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045");
     * ```
     */
    public static binaryToHumanReadable(binaryAddress: Hex): HumanReadableAddress {
        const interopAddress = parseBinary(binaryAddress);
        return toHumanReadable(interopAddress);
    }

    /**
     * Get the chain ID from a binary or human readable address
     * @param address - The binary or human readable address to get the chain ID from
     * @returns The chain ID in the format of the chain type
     */
    public static async getChainId(address: string): Promise<EncodedChainReference<ChainTypeName>> {
        let interopAddress: InteropAddress;
        if (isBinaryInteropAddress(address as BinaryAddress)) {
            interopAddress = parseBinary(address as BinaryAddress);
        } else {
            interopAddress = await parseHumanReadable(address as HumanReadableAddress);
        }

        return formatChainReference(interopAddress.chainReference, interopAddress.chainType);
    }

    /**
     * Get the address from a binary or human readable address.
     * @param address - The binary or human readable address to get the address from.
     * @returns The address in the format of the chain type.
     */
    public static async getAddress(address: string): Promise<EncodedAddress<ChainTypeName>> {
        let interopAddress: InteropAddress;
        if (isBinaryInteropAddress(address as BinaryAddress)) {
            interopAddress = parseBinary(address as BinaryAddress);
        } else {
            interopAddress = await parseHumanReadable(address as HumanReadableAddress);
        }

        return formatAddress(interopAddress.address, interopAddress.chainType);
    }

    /**
     * Builds an InteropAddress from a payload
     * @param payload - The payload to build the InteropAddress from
     * @returns The InteropAddress
     * @example
     * ```ts
     * const payload = {
     *  version: 1,
     *  chainType: "eip155",
     *  chainReference: "0x1",
     *  address: "0x1", // Can also be an ENS name like "vitalik.eth"
     * }
     * const interopAddress = await InteropAddressProvider.buildFromPayload(payload);
     * ```
     */
    public static async buildFromPayload(payload: InteropAddressFields): Promise<BinaryAddress> {
        const interopAddress = await buildInteropAddress(payload);
        return toBinary(interopAddress) as BinaryAddress;
    }

    /**
     * Computes the checksum of a human-readable address
     * @param humanReadableAddress - The human-readable address to compute the checksum of
     * @returns Checksum - The checksum
     * @throws {Error} If the human-readable address is invalid
     * @example
     * ```ts
     * const checksum = await InteropAddressProvider.computeChecksum("alice.eth@eip155:1");
     * ```
     */
    public static async computeChecksum(humanReadableAddress: string): Promise<Checksum> {
        const interopAddress = await parseHumanReadable(humanReadableAddress, {
            validateChecksumFlag: false,
        });
        return calculateChecksum(interopAddress);
    }

    /**
     * Checks if an address is a valid interop address
     * @param address - The address to check, can be a human-readable address or a binary address
     * @param options - The options to pass to the parseHumanReadable function
     *        - validateChecksumFlag: Whether to validate the checksum of the address
     * @returns boolean - true if the address is a valid interop address, false otherwise
     * @example
     * ```ts
     * const isValid = await InteropAddressProvider.isValidInteropAddress("alice.eth@eip155:1#ABCD1234", { validateChecksumFlag: true });
     * ```
     */
    public static async isValidInteropAddress(
        address: string,
        options: ParseHumanReadableOptions = {},
    ): Promise<boolean> {
        return isInteropAddress(address, options);
    }

    /**
     * Checks if a human-readable address is a valid interop address
     * @param humanReadableAddress - The human-readable address to check
     * @param options - The options to pass to the parseHumanReadable function
     *        - validateChecksumFlag: Whether to validate the checksum of the address
     * @returns boolean - true if the address is a valid interop address, false otherwise
     * @example
     * ```ts
     * const isValid = await InteropAddressProvider.isValidHumanReadableAddress("alice.eth@eip155:1#ABCD1234", { validateChecksumFlag: true });
     * ```
     */
    public static async isValidHumanReadableAddress(
        humanReadableAddress: string,
        options: ParseHumanReadableOptions = {},
    ): Promise<boolean> {
        return await isHumanReadableInteropAddress(
            humanReadableAddress as HumanReadableAddress,
            options,
        );
    }

    /**
     * Checks if a binary address is a valid interop address
     * @param binaryAddress - The binary address to check
     * @returns boolean - true if the address is a valid interop address, false otherwise
     */
    public static isValidBinaryAddress(binaryAddress: Hex): boolean {
        return isBinaryInteropAddress(binaryAddress);
    }
}

export const humanReadableToBinary = InteropAddressProvider.humanReadableToBinary;
export const binaryToHumanReadable = InteropAddressProvider.binaryToHumanReadable;
export const getChainId = InteropAddressProvider.getChainId;
export const getAddress = InteropAddressProvider.getAddress;
export const computeChecksum = InteropAddressProvider.computeChecksum;
export const buildFromPayload = InteropAddressProvider.buildFromPayload;
export const isValidInteropAddress = InteropAddressProvider.isValidInteropAddress;
export const isValidHumanReadableAddress = InteropAddressProvider.isValidHumanReadableAddress;
export const isValidBinaryAddress = InteropAddressProvider.isValidBinaryAddress;
