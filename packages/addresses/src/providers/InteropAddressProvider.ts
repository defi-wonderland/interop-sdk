import { Hex } from "viem";

import type { ParseInteroperableNameOptions } from "../internal.js";
import type { ParsedInteroperableNameResult } from "../name/index.js";
import type { ParsedInteropNameComponents } from "../name/parseInteropNameString.js";
import type { BinaryAddress } from "../types/binaryAddress.js";
import type { Checksum } from "../types/checksum.js";
import type { EncodedAddress, EncodedChainReference } from "../types/encodings.js";
import type {
    InteroperableAddress,
    InteroperableAddressText,
    InteroperableName,
} from "../types/interopAddress.js";
import {
    calculateChecksum,
    decodeInteroperableAddress,
    encodeInteroperableAddress,
} from "../binary/index.js";
import { ChainTypeName } from "../constants/interopAddress.js";
import { isBinaryInteropAddress, isInteropAddress, isInteroperableName } from "../internal.js";
import { formatInteroperableName, parseInteroperableName } from "../name/index.js";
import { addressToText, chainReferenceToText } from "../text/caip350.js";
import { toBinary, toText } from "../text/index.js";

export class InteropAddressProvider {
    private constructor() {} // prevent instantiation

    /**
     * Converts an interoperable name to a binary address.
     * This is async because it may need to resolve ENS names or chain labels.
     *
     * @param name - Either an interoperable name string or raw components from parseInteropNameString
     * @param opts - Options for encoding format (hex or bytes)
     * @returns The binary address in the specified format
     * @example
     * ```ts
     * const binaryAddress = await InteropAddressProvider.nameToBinary("alice.eth@eip155:1#ABCD1234");
     * ```
     */
    public static async nameToBinary(
        name: string | ParsedInteropNameComponents,
        opts: { format?: "hex" | "bytes" } = {},
    ): Promise<Hex | Uint8Array> {
        const result = await parseInteroperableName(name);
        return encodeInteroperableAddress(result.address, opts) as Hex | Uint8Array;
    }

    /**
     * Converts a binary address to an interoperable name.
     * @param binaryAddress - The binary address to convert.
     * @returns InteroperableName - The interoperable name.
     * @example
     * ```ts
     * const interoperableName =
     *   InteropAddressProvider.binaryToName("0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045");
     * ```
     */
    public static binaryToName(binaryAddress: Hex | Uint8Array): InteroperableName {
        const addr = decodeInteroperableAddress(binaryAddress);
        const text = toText(addr);
        // calculateChecksum already validates through ChecksumSchema internally
        const checksum = calculateChecksum(addr);
        return formatInteroperableName(text, checksum);
    }

    /**
     * Get the chain ID from a binary address or interoperable name
     * @param address - The binary address or interoperable name to get the chain ID from
     * @returns The chain ID in the format of the chain type
     */
    public static async getChainId(address: string): Promise<EncodedChainReference<ChainTypeName>> {
        let interopAddress: InteroperableAddress;
        if (isBinaryInteropAddress(address as BinaryAddress)) {
            interopAddress = decodeInteroperableAddress(address as BinaryAddress);
        } else {
            const result: ParsedInteroperableNameResult = await parseInteroperableName(
                address as InteroperableName,
            );
            interopAddress = result.address;
        }

        return chainReferenceToText(
            interopAddress.chainReference,
            interopAddress.chainType,
        ) as EncodedChainReference<ChainTypeName>;
    }

    /**
     * Get the address from a binary address or interoperable name.
     * @param address - The binary address or interoperable name to get the address from.
     * @returns The address in the format of the chain type.
     */
    public static async getAddress(address: string): Promise<EncodedAddress<ChainTypeName>> {
        let interopAddress: InteroperableAddress;
        if (isBinaryInteropAddress(address as BinaryAddress)) {
            interopAddress = decodeInteroperableAddress(address as BinaryAddress);
        } else {
            const result: ParsedInteroperableNameResult = await parseInteroperableName(
                address as InteroperableName,
            );
            interopAddress = result.address;
        }

        return addressToText(
            interopAddress.address,
            interopAddress.chainType,
        ) as EncodedAddress<ChainTypeName>;
    }

    /**
     * Converts InteroperableAddressText to a binary address.
     * This is a synchronous convenience method that chains toBinary and encodeInteroperableAddress.
     * Use this when you already have structured data with CAIP-350 text-encoded fields and don't need resolution (ENS, chain labels).
     *
     * @param text - Structured object with fields using CAIP-350 text encoding rules (per chainType)
     * @param opts - Options for encoding format (hex or bytes)
     * @returns The binary address in the specified format
     * @example
     * ```ts
     * const binaryAddress = InteropAddressProvider.textToBinary({
     *   version: 1,
     *   chainType: "eip155",
     *   chainReference: "1",
     *   address: "0x1"
     * });
     * ```
     */
    public static textToBinary(
        text: InteroperableAddressText,
        opts: { format?: "hex" | "bytes" } = {},
    ): Hex | Uint8Array {
        const binary = toBinary(text);
        return encodeInteroperableAddress(binary, opts) as Hex | Uint8Array;
    }

    /**
     * Converts a binary address to InteroperableAddressText.
     * This is a synchronous convenience method that wraps the text layer's toText function.
     *
     * @param binaryAddress - The binary address to convert
     * @returns Structured object with fields using CAIP-350 text encoding rules (per chainType)
     * @example
     * ```ts
     * const text = InteropAddressProvider.binaryToText("0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045");
     * ```
     */
    public static binaryToText(binaryAddress: Hex | Uint8Array): InteroperableAddressText {
        const addr = decodeInteroperableAddress(binaryAddress);
        return toText(addr);
    }

    /**
     * Computes the checksum of an interoperable name
     * @param interoperableName - The interoperable name to compute the checksum of
     * @returns Checksum - The checksum
     * @throws {Error} If the interoperable name is invalid
     * @example
     * ```ts
     * const checksum = await InteropAddressProvider.computeChecksum("alice.eth@eip155:1");
     * ```
     */
    public static async computeChecksum(interoperableName: string): Promise<Checksum> {
        const result = await parseInteroperableName(interoperableName);
        // calculateChecksum already validates through ChecksumSchema internally
        return calculateChecksum(result.address);
    }

    /**
     * Checks if an address is a valid interop address
     * @param address - The address to check, can be an interoperable name or a binary address
     * @param options - The options to pass to the parseInteroperableName function
     *        - validateChecksumFlag: Whether to validate the checksum of the address
     * @returns boolean - true if the address is a valid interop address, false otherwise
     * @example
     * ```ts
     * const isValid = await InteropAddressProvider.isValidInteropAddress("alice.eth@eip155:1#ABCD1234", { validateChecksumFlag: true });
     * ```
     */
    public static async isValidInteropAddress(
        address: string,
        options: ParseInteroperableNameOptions = {},
    ): Promise<boolean> {
        return isInteropAddress(address, options);
    }

    /**
     * Checks if an interoperable name is a valid interop address
     * @param interoperableName - The interoperable name to check
     * @param options - The options to pass to the parseInteroperableName function
     *        - validateChecksumFlag: Whether to validate the checksum of the address
     * @returns boolean - true if the address is a valid interop address, false otherwise
     * @example
     * ```ts
     * const isValid = await InteropAddressProvider.isValidInteroperableName("alice.eth@eip155:1#ABCD1234", { validateChecksumFlag: true });
     * ```
     */
    public static async isValidInteroperableName(
        interoperableName: string,
        options: ParseInteroperableNameOptions = {},
    ): Promise<boolean> {
        return await isInteroperableName(interoperableName as InteroperableName, options);
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

// High-level convenience methods
/**
 * Converts an interoperable name to a binary address.
 * This is async because it may need to resolve ENS names or chain labels.
 *
 * @param name - Either an interoperable name string or raw components from parseInteropNameString
 * @param opts - Options for encoding format (hex or bytes)
 * @returns The binary address in the specified format
 * @example
 * ```ts
 * const binaryAddress = await nameToBinary("alice.eth@eip155:1#ABCD1234");
 * ```
 */
export const nameToBinary = InteropAddressProvider.nameToBinary;

/**
 * Converts a binary address to an interoperable name.
 *
 * @param binaryAddress - The binary address to convert
 * @returns The interoperable name string
 * @example
 * ```ts
 * const interoperableName = binaryToName("0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045");
 * ```
 */
export const binaryToName = InteropAddressProvider.binaryToName;

/**
 * Converts InteroperableAddressText to a binary address.
 * This is a synchronous convenience method that chains toBinary and encodeInteroperableAddress.
 * Use this when you already have structured data with CAIP-350 text-encoded fields and don't need resolution (ENS, chain labels).
 *
 * @param text - Structured object with fields using CAIP-350 text encoding rules (per chainType)
 * @param opts - Options for encoding format (hex or bytes)
 * @returns The binary address in the specified format
 * @example
 * ```ts
 * const binaryAddress = textToBinary({
 *   version: 1,
 *   chainType: "eip155",
 *   chainReference: "1",
 *   address: "0x1"
 * });
 * ```
 */
export const textToBinary = InteropAddressProvider.textToBinary;

/**
 * Converts a binary address to InteroperableAddressText.
 * This is a synchronous convenience method that wraps the text layer's toText function.
 *
 * @param binaryAddress - The binary address to convert
 * @returns Structured object with fields using CAIP-350 text encoding rules (per chainType)
 * @example
 * ```ts
 * const text = binaryToText("0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045");
 * ```
 */
export const binaryToText = InteropAddressProvider.binaryToText;

/**
 * Get the chain ID from a binary address or interoperable name.
 *
 * @param address - The binary address or interoperable name to get the chain ID from
 * @returns The chain ID in the format of the chain type
 * @example
 * ```ts
 * const chainId = await getChainId("vitalik.eth@eip155:1#4CA88C9C");
 * // Returns: "1"
 * ```
 */
export const getChainId = InteropAddressProvider.getChainId;

/**
 * Get the address from a binary address or interoperable name.
 *
 * @param address - The binary address or interoperable name to get the address from
 * @returns The address in the format of the chain type
 * @example
 * ```ts
 * const address = await getAddress("vitalik.eth@eip155:1#4CA88C9C");
 * // Returns: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
 * ```
 */
export const getAddress = InteropAddressProvider.getAddress;

/**
 * Computes the checksum of an interoperable name.
 *
 * @param interoperableName - The interoperable name to compute the checksum of
 * @returns The checksum
 * @throws {Error} If the interoperable name is invalid
 * @example
 * ```ts
 * const checksum = await computeChecksum("alice.eth@eip155:1");
 * ```
 */
export const computeChecksum = InteropAddressProvider.computeChecksum;

/**
 * Checks if an address is a valid interop address.
 *
 * @param address - The address to check, can be an interoperable name or a binary address
 * @param options - The options to pass to the parseInteroperableName function
 * @param options.validateChecksumFlag - Whether to validate the checksum of the address
 * @returns true if the address is a valid interop address, false otherwise
 * @example
 * ```ts
 * const isValid = await isValidInteropAddress("alice.eth@eip155:1#ABCD1234", { validateChecksumFlag: true });
 * ```
 */
export const isValidInteropAddress = InteropAddressProvider.isValidInteropAddress;

/**
 * Checks if an interoperable name is a valid interop address.
 *
 * @param interoperableName - The interoperable name to check
 * @param options - The options to pass to the parseInteroperableName function
 * @param options.validateChecksumFlag - Whether to validate the checksum of the address
 * @returns true if the address is a valid interop address, false otherwise
 * @example
 * ```ts
 * const isValid = await isValidInteroperableName("alice.eth@eip155:1#ABCD1234", { validateChecksumFlag: true });
 * ```
 */
export const isValidInteroperableName = InteropAddressProvider.isValidInteroperableName;

/**
 * Checks if a binary address is a valid interop address.
 *
 * @param binaryAddress - The binary address to check
 * @returns true if the address is a valid interop address, false otherwise
 * @example
 * ```ts
 * const isValid = isValidBinaryAddress("0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045");
 * ```
 */
export const isValidBinaryAddress = InteropAddressProvider.isValidBinaryAddress;

// Binary layer functions - re-exported for direct use
export {
    calculateChecksum,
    decodeInteroperableAddress,
    encodeInteroperableAddress,
} from "../binary/index.js";

// Text layer functions - re-exported for direct use
export { toText, toBinary } from "../text/index.js";

// Name layer functions - re-exported for direct use
export { parseInteroperableName, formatInteroperableName } from "../name/index.js";
