import { Hex } from "viem";

import type { FormatResult, ValidateChecksumOptions } from "../address/index.js";
import type { ParseInteroperableNameOptions } from "../internal.js";
import type { ParsedInteroperableNameResult } from "../name/index.js";
import type { ParsedInteropNameComponents } from "../name/parseInteropNameString.js";
import type { BinaryAddress } from "../types/binaryAddress.js";
import type { Checksum } from "../types/checksum.js";
import type { EncodedAddress, EncodedChainReference } from "../types/encodings.js";
import type {
    InteroperableAddress,
    InteroperableAddressBinary,
    InteroperableAddressText,
    InteroperableName,
} from "../types/interopAddress.js";
import {
    calculateChecksum,
    decodeAddress,
    encodeAddress,
    toBinaryRepresentation,
    toTextRepresentation,
    validateChecksum,
    validateInteroperableAddress,
} from "../address/index.js";
import { ChainTypeName } from "../constants/interopAddress.js";
import { isBinaryInteropAddress, isInteropAddress, isInteroperableName } from "../internal.js";
import { formatName, parseName } from "../name/index.js";
import { isBinaryAddress, isTextAddress } from "../types/interopAddress.js";

type EncodeFormat = "hex" | "bytes";

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
    public static async nameToBinary<T extends "hex" | "bytes" | undefined = undefined>(
        name: string | ParsedInteropNameComponents,
        opts?: { format?: T },
    ): Promise<FormatResult<T>> {
        const result = await parseName(name);
        return encodeAddress(result.interoperableAddress, opts);
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
        const addr = decodeAddress(binaryAddress);
        // formatName calculates checksum internally
        return formatName(addr);
    }

    /**
     * Get the chain ID from a binary address or interoperable name
     * @param address - The binary address or interoperable name to get the chain ID from
     * @returns The chain ID in the format of the chain type
     */
    public static async getChainId(address: string): Promise<EncodedChainReference<ChainTypeName>> {
        let interopAddress: InteroperableAddress;
        if (isBinaryInteropAddress(address as BinaryAddress)) {
            interopAddress = decodeAddress(address as BinaryAddress, { representation: "text" });
        } else {
            const result: ParsedInteroperableNameResult = await parseName(
                address as InteroperableName,
            );
            interopAddress = result.interoperableAddress;
        }

        // Extract text field - address is guaranteed to be text variant
        if (!isTextAddress(interopAddress)) {
            throw new Error("Internal error: expected text representation");
        }
        return (interopAddress.chainReference ?? "") as EncodedChainReference<ChainTypeName>;
    }

    /**
     * Get the address from a binary address or interoperable name.
     * @param address - The binary address or interoperable name to get the address from.
     * @returns The address in the format of the chain type.
     */
    public static async getAddress(address: string): Promise<EncodedAddress<ChainTypeName>> {
        let interopAddress: InteroperableAddress;
        if (isBinaryInteropAddress(address as BinaryAddress)) {
            interopAddress = decodeAddress(address as BinaryAddress, { representation: "text" });
        } else {
            const result: ParsedInteroperableNameResult = await parseName(
                address as InteroperableName,
            );
            interopAddress = result.interoperableAddress;
        }

        // Extract text field - address is guaranteed to be text variant
        if (!isTextAddress(interopAddress)) {
            throw new Error("Internal error: expected text representation");
        }
        return (interopAddress.address ?? "") as EncodedAddress<ChainTypeName>;
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
        const result = await parseName(interoperableName);
        // calculateChecksum already validates through ChecksumSchema internally
        return calculateChecksum(result.interoperableAddress);
    }

    /**
     * Checks if an address is a valid interop address
     * @param address - The address to check, can be an interoperable name or a binary address
     * @param options - The options to pass to the parseName function
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
     * @param options - The options to pass to the parseName function
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

    // Address Layer Functions

    /**
     * Decodes a binary address to an InteroperableAddress.
     * Defaults to text representation.
     *
     * @param value - The binary address (Uint8Array or hex string)
     * @param opts - Decoding options
     * @param opts.representation - Representation to return: "binary" or "text" (defaults to "text")
     * @returns The decoded address in the specified representation
     * @example
     * ```ts
     * // Get text representation (default)
     * const addr = InteropAddressProvider.decodeAddress("0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045");
     *
     * // Get binary representation
     * const binaryAddr = InteropAddressProvider.decodeAddress("0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045", { representation: "binary" });
     * ```
     */
    public static decodeAddress(
        value: Uint8Array | Hex,
        opts: { representation: "binary" },
    ): InteroperableAddressBinary;
    public static decodeAddress(
        value: Uint8Array | Hex,
        opts?: { representation?: "text" },
    ): InteroperableAddressText;
    public static decodeAddress(
        value: Uint8Array | Hex,
        opts?: { representation?: "binary" | "text" },
    ): InteroperableAddress {
        // Handle overloads by checking representation value
        if (opts?.representation === "binary") {
            return decodeAddress(value, { representation: "binary" });
        }
        // Default to text representation
        return decodeAddress(value);
    }

    /**
     * Encodes an InteroperableAddress to binary format.
     * Accepts either binary or text representation and converts automatically.
     *
     * @param addr - The interoperable address (binary or text representation)
     * @param opts - Encoding options
     * @param opts.format - Output format: "hex" or "bytes" (defaults to "hex")
     * @returns The encoded address in the specified format
     * @example
     * ```ts
     * // Encode text representation
     * const hex = InteropAddressProvider.encodeAddress(
     *   { version: 1, chainType: "eip155", chainReference: "1", address: "0x..." },
     *   { format: "hex" }
     * );
     *
     * // Encode binary representation
     * const hex2 = InteropAddressProvider.encodeAddress(binaryAddr, { format: "hex" });
     * ```
     */
    public static encodeAddress<T extends EncodeFormat | undefined = undefined>(
        addr: InteroperableAddress,
        opts?: { format?: T },
    ): FormatResult<T> {
        return encodeAddress(addr, opts);
    }

    /**
     * Converts a text representation to a binary representation.
     *
     * @param addr - The interoperable address (binary or text representation)
     * @returns The address in binary representation
     * @example
     * ```ts
     * const textAddr = { version: 1, chainType: "eip155", chainReference: "1", address: "0x..." };
     * const binaryAddr = InteropAddressProvider.toBinaryRepresentation(textAddr);
     * ```
     */
    public static toBinaryRepresentation(addr: InteroperableAddress): InteroperableAddressBinary {
        return toBinaryRepresentation(addr);
    }

    /**
     * Converts a binary representation to a text representation.
     *
     * @param addr - The interoperable address (binary or text representation)
     * @returns The address in text representation
     * @example
     * ```ts
     * const binaryAddr = InteropAddressProvider.decodeAddress("0x...", { representation: "binary" });
     * const textAddr = InteropAddressProvider.toTextRepresentation(binaryAddr);
     * ```
     */
    public static toTextRepresentation(addr: InteroperableAddress): InteroperableAddressText {
        return toTextRepresentation(addr);
    }

    /**
     * Calculates a checksum for an InteroperableAddress.
     * Accepts either binary or text representation.
     *
     * @param addr - The interoperable address (binary or text representation)
     * @returns The calculated checksum
     * @example
     * ```ts
     * const checksum = InteropAddressProvider.calculateChecksum(addr);
     * ```
     */
    public static calculateChecksum(addr: InteroperableAddress): Checksum {
        return calculateChecksum(addr);
    }

    /**
     * Validates an InteroperableAddress structure.
     * Accepts either binary or text representation.
     *
     * @param addr - The interoperable address to validate
     * @returns The validated address
     * @throws {InvalidInteroperableAddress} If the address doesn't match the schema
     * @example
     * ```ts
     * const validated = InteropAddressProvider.validateInteroperableAddress(addr);
     * ```
     */
    public static validateInteroperableAddress(addr: InteroperableAddress): InteroperableAddress {
        return validateInteroperableAddress(addr);
    }

    /**
     * Validates a checksum against an InteroperableAddress.
     * Accepts either binary or text representation.
     *
     * @param addr - The interoperable address (binary or text representation)
     * @param checksum - The checksum to validate against
     * @param options - Validation options
     * @param options.isENSName - Whether the address is an ENS name (affects error type)
     * @throws {InvalidChecksum} If the checksum is invalid for a raw address
     * @throws {ChecksumMismatchWarning} If the checksum is invalid for an ENS name
     * @example
     * ```ts
     * InteropAddressProvider.validateChecksum(addr, "4CA88C9C");
     * ```
     */
    public static validateChecksum(
        addr: InteroperableAddress,
        checksum: Checksum,
        options?: ValidateChecksumOptions,
    ): void {
        return validateChecksum(addr, checksum, options);
    }

    // Name Layer Functions

    /**
     * Parses an interoperable name into an address with metadata.
     * Defaults to text representation.
     *
     * @param input - Either an interoperable name string or parsed components
     * @param opts - Parsing options
     * @param opts.representation - Representation to return: "binary" or "text" (defaults to "text")
     * @returns The parsed result with address in the specified representation and metadata
     * @example
     * ```ts
     * // Get text representation (default)
     * const result = await InteropAddressProvider.parseName("vitalik.eth@eip155:1#4CA88C9C");
     *
     * // Get binary representation
     * const result2 = await InteropAddressProvider.parseName("vitalik.eth@eip155:1#4CA88C9C", { representation: "binary" });
     * ```
     */
    public static parseName(
        input: string | ParsedInteropNameComponents,
        opts: { representation: "binary" },
    ): Promise<ParsedInteroperableNameResult<InteroperableAddressBinary>>;
    public static parseName(
        input: string | ParsedInteropNameComponents,
        opts?: { representation?: "text" },
    ): Promise<ParsedInteroperableNameResult<InteroperableAddressText>>;
    public static parseName(
        input: string | ParsedInteropNameComponents,
        opts?: { representation?: "binary" | "text" },
    ): Promise<ParsedInteroperableNameResult> {
        // Handle overloads by checking representation value
        if (opts?.representation === "binary") {
            return parseName(input, { representation: "binary" });
        }
        // Default to text representation
        return parseName(input);
    }

    /**
     * Formats an InteroperableAddress into an interoperable name.
     * Accepts either binary or text representation and calculates checksum automatically.
     *
     * @param addr - The interoperable address (binary or text representation)
     * @param opts - Formatting options
     * @param opts.includeChecksum - Whether to include the checksum (defaults to true)
     * @returns The formatted interoperable name
     * @example
     * ```ts
     * // Format with checksum (default)
     * const name = InteropAddressProvider.formatName(addr);
     *
     * // Format without checksum
     * const name2 = InteropAddressProvider.formatName(addr, { includeChecksum: false });
     * ```
     */
    public static formatName(
        addr: InteroperableAddress,
        opts?: { includeChecksum?: boolean },
    ): InteroperableName {
        return formatName(addr, opts);
    }

    // Type Guards

    /**
     * Type guard to check if an address is in text representation.
     *
     * @param addr - The address to check
     * @returns true if the address is in text representation
     * @example
     * ```ts
     * if (InteropAddressProvider.isTextAddress(addr)) {
     *   console.log(addr.chainType); // TypeScript knows this is "eip155" | "solana"
     * }
     * ```
     */
    public static isTextAddress(addr: InteroperableAddress): addr is InteroperableAddressText {
        return isTextAddress(addr);
    }

    /**
     * Type guard to check if an address is in binary representation.
     *
     * @param addr - The address to check
     * @returns true if the address is in binary representation
     * @example
     * ```ts
     * if (InteropAddressProvider.isBinaryAddress(addr)) {
     *   console.log(addr.chainType); // TypeScript knows this is Uint8Array
     * }
     * ```
     */
    public static isBinaryAddress(addr: InteroperableAddress): addr is InteroperableAddressBinary {
        return isBinaryAddress(addr);
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
export async function nameToBinary<T extends "hex" | "bytes" | undefined = undefined>(
    name: string | ParsedInteropNameComponents,
    opts?: { format?: T },
): Promise<FormatResult<T>> {
    return InteropAddressProvider.nameToBinary(name, opts);
}

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
 * @param options - The options to pass to the parseName function
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
 * @param options - The options to pass to the parseName function
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
