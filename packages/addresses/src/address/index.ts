import { bytesToNumber, fromBytes, fromHex, Hex, keccak256, toBytes, toHex } from "viem";

import type { Checksum } from "../types/checksum.js";
import type {
    InteroperableAddress,
    InteroperableAddressBinary,
    InteroperableAddressText,
} from "../types/interopAddress.js";
import {
    BINARY_LENGTHS,
    BINARY_OFFSETS,
    CHAIN_TYPE,
    CHAIN_TYPE_VALUE_TO_NAME,
    ChainTypeName,
    ChainTypeValue,
    ChecksumMismatchWarning,
    ChecksumSchema,
    convertToBytes,
    InvalidBinaryInteropAddress,
    InvalidChecksum,
    InvalidInteroperableAddress,
    UnsupportedChainType,
} from "../internal.js";
import { interoperableAddressSchema } from "../schemas/interoperableAddress.schema.js";
import { isTextAddress } from "../types/interopAddress.js";
import {
    addressToBinary,
    addressToText,
    chainReferenceToBinary,
    chainReferenceToText,
} from "./caip350.js";

type EncodeFormat = "hex" | "bytes";

export type FormatResult<T extends EncodeFormat | undefined> = T extends "hex"
    ? Hex
    : T extends "bytes"
      ? Uint8Array
      : Hex | Uint8Array;

/**
 * Extracts the version from a binary interop address.
 * From position 0 with length 2.
 */
const parseVersion = (binaryAddress: Uint8Array): number => {
    const version = binaryAddress.slice(
        BINARY_OFFSETS.VERSION,
        BINARY_OFFSETS.VERSION + BINARY_LENGTHS.VERSION,
    );

    if (version.length !== BINARY_LENGTHS.VERSION) {
        throw new InvalidBinaryInteropAddress(
            `Invalid version length, expected: ${BINARY_LENGTHS.VERSION}, got: ${version.length}`,
        );
    }

    return bytesToNumber(version);
};

/**
 * Extracts the chain type from a binary interop address.
 * From position 2 with length 2.
 */
const parseChainType = (binaryAddress: Uint8Array): Uint8Array => {
    const chainType = binaryAddress.slice(
        BINARY_OFFSETS.CHAIN_TYPE,
        BINARY_OFFSETS.CHAIN_TYPE + BINARY_LENGTHS.CHAIN_TYPE,
    );

    if (chainType.length !== BINARY_LENGTHS.CHAIN_TYPE) {
        throw new InvalidBinaryInteropAddress(
            `Invalid chain type length, expected: ${BINARY_LENGTHS.CHAIN_TYPE}, got: ${chainType.length}`,
        );
    }

    return chainType;
};

/**
 * Extracts the chain reference length from a binary interop address.
 * From position 4 with length 1.
 */
const parseChainReferenceLength = (binaryAddress: Uint8Array): number => {
    const chainReferenceLength = binaryAddress.slice(
        BINARY_OFFSETS.CHAIN_REFERENCE_LENGTH,
        BINARY_OFFSETS.CHAIN_REFERENCE_LENGTH + BINARY_LENGTHS.CHAIN_REFERENCE_LENGTH,
    );

    if (chainReferenceLength.length !== BINARY_LENGTHS.CHAIN_REFERENCE_LENGTH) {
        throw new InvalidBinaryInteropAddress(
            `Invalid chain reference length, expected: ${BINARY_LENGTHS.CHAIN_REFERENCE_LENGTH}, got: ${chainReferenceLength.length}`,
        );
    }

    return bytesToNumber(chainReferenceLength);
};

/**
 * Extracts the chain reference from a binary interop address.
 * From position 5 with length of the chain reference length.
 */
const parseChainReference = (binaryAddress: Uint8Array): Uint8Array => {
    const chainReferenceLength = parseChainReferenceLength(binaryAddress);

    const chainReference = binaryAddress.slice(
        BINARY_OFFSETS.CHAIN_REFERENCE,
        BINARY_OFFSETS.CHAIN_REFERENCE + chainReferenceLength,
    );

    if (chainReference.length !== chainReferenceLength) {
        throw new InvalidBinaryInteropAddress(
            `Invalid chain reference length, expected: ${chainReferenceLength}, got: ${chainReference.length}`,
        );
    }

    return chainReference;
};

/**
 * Extracts the address length from a binary interop address.
 * From position 5 + chain reference length with length 1.
 */
const parseAddressLength = (binaryAddress: Uint8Array): number => {
    const addressLengthOffset =
        BINARY_OFFSETS.CHAIN_REFERENCE + parseChainReferenceLength(binaryAddress);

    const addressLength = binaryAddress.slice(
        addressLengthOffset,
        addressLengthOffset + BINARY_LENGTHS.ADDRESS_LENGTH,
    );

    if (addressLength.length !== BINARY_LENGTHS.ADDRESS_LENGTH) {
        throw new InvalidBinaryInteropAddress(
            `Invalid address length, expected: ${BINARY_LENGTHS.ADDRESS_LENGTH}, got: ${addressLength.length}`,
        );
    }

    return bytesToNumber(addressLength);
};

/**
 * Extracts the address from a binary interop address.
 * From position 6 + chain reference length with length of the address length.
 */
const parseAddress = (binaryAddress: Uint8Array): Uint8Array => {
    const addressOffset =
        BINARY_OFFSETS.CHAIN_REFERENCE +
        parseChainReferenceLength(binaryAddress) +
        BINARY_LENGTHS.ADDRESS_LENGTH;

    const addressLength = parseAddressLength(binaryAddress);

    const address = binaryAddress.slice(addressOffset, addressOffset + addressLength);

    if (address.length !== addressLength) {
        throw new InvalidBinaryInteropAddress(
            `Invalid address length, expected: ${addressLength}, got: ${address.length}`,
        );
    }

    return address;
};

/**
 * Parses an interoperable address from its EIP-7930 byte/hex representation.
 *
 * @param value - The binary address as Uint8Array or Hex string
 * @param opts - Decoding options
 * @param opts.representation - Representation to return: "binary" or "text" (defaults to "text")
 * @returns InteroperableAddress with the specified representation
 * @example
 * ```ts
 * // Get text representation (default)
 * const textAddr = decodeAddress("0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045");
 *
 * // Get binary representation
 * const binaryAddr = decodeAddress("0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045", { representation: "binary" });
 * ```
 */
export function decodeAddress(
    value: Uint8Array | Hex,
    opts?: { representation: "binary" },
): InteroperableAddressBinary;
export function decodeAddress(
    value: Uint8Array | Hex,
    opts?: { representation?: "text" },
): InteroperableAddressText;
export function decodeAddress(
    value: Uint8Array | Hex,
    opts?: { representation?: "binary" | "text" },
): InteroperableAddress {
    const bytes = typeof value === "string" ? fromHex(value, "bytes") : value;
    const representation = opts?.representation ?? "text";

    // Validate minimum envelope structure length
    // Minimum: version (2) + chainType (2) + chainReferenceLength (1) + addressLength (1) = 6 bytes
    const MINIMUM_ENVELOPE_LENGTH = 6;
    if (bytes.length < MINIMUM_ENVELOPE_LENGTH) {
        throw new InvalidBinaryInteropAddress(
            `Invalid binary address length: expected at least ${MINIMUM_ENVELOPE_LENGTH} bytes, got ${bytes.length}`,
        );
    }

    const version = parseVersion(bytes);

    // Validate version value (currently only version 1 is supported)
    if (version !== 1) {
        throw new InvalidBinaryInteropAddress(`Unsupported version: expected 1, got ${version}`);
    }

    const chainTypeBinary = parseChainType(bytes);

    // Validate chainReferenceLength bounds before parsing (prevents allocating huge arrays)
    // The parse functions will validate the actual data exists
    const chainReferenceLength = parseChainReferenceLength(bytes);
    if (chainReferenceLength > 32) {
        throw new InvalidBinaryInteropAddress(
            `Invalid chain reference length: expected <= 32 bytes, got ${chainReferenceLength}`,
        );
    }

    const chainReferenceBinary = parseChainReference(bytes);

    // Validate addressLength bounds before parsing (prevents allocating huge arrays)
    // The parse functions will validate the actual data exists
    const addressLength = parseAddressLength(bytes);
    if (addressLength > 255) {
        throw new InvalidBinaryInteropAddress(
            `Invalid address length: expected <= 255 bytes, got ${addressLength}`,
        );
    }

    const addressBinary = parseAddress(bytes);

    // Validate that at least one of chainReference or address is present
    if (chainReferenceBinary.length === 0 && addressBinary.length === 0) {
        throw new InvalidBinaryInteropAddress(
            "At least one of chainReference or address must be provided",
        );
    }

    // If binary representation requested, return directly
    if (representation === "binary") {
        const binaryAddr: InteroperableAddressBinary = {
            version,
            chainType: chainTypeBinary,
        };

        if (chainReferenceBinary.length > 0) {
            binaryAddr.chainReference = chainReferenceBinary;
        }

        if (addressBinary.length > 0) {
            binaryAddr.address = addressBinary;
        }

        return validateInteroperableAddress(binaryAddr) as InteroperableAddressBinary;
    }

    // Otherwise, compute text representation
    const chainTypeHex = toHex(chainTypeBinary) as ChainTypeValue;
    const chainTypeText = CHAIN_TYPE_VALUE_TO_NAME[chainTypeHex];
    if (!chainTypeText) {
        throw new UnsupportedChainType(chainTypeHex);
    }

    const textAddr: InteroperableAddressText = {
        version,
        chainType: chainTypeText,
    };

    // Add chain reference if present
    if (chainReferenceBinary.length > 0) {
        const chainReferenceText = chainReferenceToText(chainReferenceBinary, chainTypeBinary);
        textAddr.chainReference = chainReferenceText;
    }

    // Add address if present
    if (addressBinary.length > 0) {
        const addressTextResult = addressToText(addressBinary, chainTypeBinary);
        textAddr.address = String(addressTextResult);
    }

    return validateInteroperableAddress(textAddr) as InteroperableAddressText;
}

/**
 * Serializes an `InteroperableAddress` into the EIP-7930 byte layout.
 *
 * Accepts either binary or text representation and converts internally if needed.
 *
 * Layout (big-endian):
 * - version:              2 bytes
 * - chainType:            2 bytes
 * - chainReferenceLength: 1 byte
 * - chainReference:       N bytes
 * - addressLength:        1 byte
 * - address:              M bytes
 *
 * @param addr - The interoperable address (binary or text representation)
 * @param opts - Encoding options
 * @param opts.format - Output format: "hex" or "bytes"
 * @returns The encoded address in the specified format
 * @example
 * ```ts
 * // Encode text representation
 * const hex = encodeAddress({ version: 1, chainType: "eip155", chainReference: "1", address: "0x..." }, { format: "hex" });
 *
 * // Encode binary representation
 * const hex2 = encodeAddress(binaryAddr, { format: "hex" });
 * ```
 */
export const encodeAddress = <T extends EncodeFormat | undefined = undefined>(
    addr: InteroperableAddress,
    opts?: { format?: T },
): FormatResult<T> => {
    const { format = "hex" } = opts ?? {};

    // Validate input (handles both binary and text representations)
    const validated = validateInteroperableAddress(addr);

    // Convert to binary if needed
    const binaryAddr = isTextAddress(validated) ? toBinaryRepresentation(validated) : validated;

    // At this point, binaryAddr is guaranteed to be binary variant
    if (!(binaryAddr.chainType instanceof Uint8Array)) {
        throw new Error("Internal error: expected binary representation after conversion");
    }

    const versionBytes = toBytes(binaryAddr.version, { size: BINARY_LENGTHS.VERSION });
    const chainTypeBytes = binaryAddr.chainType;
    const chainReferenceBytes = binaryAddr.chainReference ?? new Uint8Array();
    const chainReferenceLengthBytes = toBytes(chainReferenceBytes.length, {
        size: BINARY_LENGTHS.CHAIN_REFERENCE_LENGTH,
    });
    const addressBytes = binaryAddr.address ?? new Uint8Array();
    const addressLengthBytes = toBytes(addressBytes.length, {
        size: BINARY_LENGTHS.ADDRESS_LENGTH,
    });

    const totalLength =
        versionBytes.length +
        chainTypeBytes.length +
        chainReferenceLengthBytes.length +
        chainReferenceBytes.length +
        addressLengthBytes.length +
        addressBytes.length;

    const bytes = new Uint8Array(totalLength);
    let offset = 0;
    bytes.set(versionBytes, offset);
    offset += versionBytes.length;
    bytes.set(chainTypeBytes, offset);
    offset += chainTypeBytes.length;
    bytes.set(chainReferenceLengthBytes, offset);
    offset += chainReferenceLengthBytes.length;
    bytes.set(chainReferenceBytes, offset);
    offset += chainReferenceBytes.length;
    bytes.set(addressLengthBytes, offset);
    offset += addressLengthBytes.length;
    bytes.set(addressBytes, offset);

    if (format === "bytes") {
        return bytes as FormatResult<T>;
    }

    return fromBytes(bytes, "hex") as FormatResult<T>;
};

/**
 * Converts a text representation to a binary representation.
 *
 * @param addr - InteroperableAddress with text representation
 * @returns InteroperableAddress with binary representation
 * @throws {InvalidInteroperableAddress} If the address is invalid
 * @example
 * ```ts
 * const textAddr = {
 *   version: 1,
 *   chainType: "eip155",
 *   chainReference: "1",
 *   address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
 * };
 * const binaryAddr = toBinaryRepresentation(textAddr);
 * ```
 */
export function toBinaryRepresentation(addr: InteroperableAddress): InteroperableAddressBinary {
    // Validate input first (handles both binary and text representations)
    const validated = validateInteroperableAddress(addr);

    if (!isTextAddress(validated)) {
        // Already binary, return validated (may have normalized chainType)
        return validated;
    }

    const { version, chainType, chainReference, address } = validated;

    const chainTypeValue = CHAIN_TYPE[chainType];
    const chainTypeBytes: Uint8Array = convertToBytes(chainTypeValue, "hex");

    // Handle optional chainReference
    const chainReferenceBytes: Uint8Array = chainReference
        ? chainReferenceToBinary(chainReference, chainType as ChainTypeName)
        : new Uint8Array();

    // Handle optional address
    const addressBytes: Uint8Array = address
        ? addressToBinary(address, chainType as ChainTypeName)
        : new Uint8Array();

    // Build binary variant
    const binaryAddr: InteroperableAddressBinary = {
        version,
        chainType: chainTypeBytes,
    };

    if (chainReference) {
        binaryAddr.chainReference = chainReferenceBytes;
    }

    if (address) {
        binaryAddr.address = addressBytes;
    }

    return validateInteroperableAddress(binaryAddr) as InteroperableAddressBinary;
}

/**
 * Converts a binary representation to a text representation.
 *
 * @param addr - InteroperableAddress with binary representation
 * @returns InteroperableAddress with text representation
 * @throws {UnsupportedChainType} If the chain type is not supported
 * @example
 * ```ts
 * const binaryAddr = decodeAddress("0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045", { representation: "binary" });
 * const textAddr = toTextRepresentation(binaryAddr);
 * ```
 */
export function toTextRepresentation(addr: InteroperableAddress): InteroperableAddressText {
    if (isTextAddress(addr)) {
        // Already text, return as-is
        return addr;
    }

    const { version, chainType, chainReference, address } = addr;

    // Convert chain type binary to text
    const chainTypeHex = toHex(chainType) as ChainTypeValue;
    const chainTypeText = CHAIN_TYPE_VALUE_TO_NAME[chainTypeHex];
    if (!chainTypeText) {
        throw new UnsupportedChainType(chainTypeHex);
    }

    // Build text variant
    const textAddr: InteroperableAddressText = {
        version,
        chainType: chainTypeText,
    };

    // Add chain reference if present
    if (chainReference && chainReference.length > 0) {
        const chainReferenceText = chainReferenceToText(chainReference, chainType);
        textAddr.chainReference = chainReferenceText;
    }

    // Add address if present
    if (address && address.length > 0) {
        const addressTextResult = addressToText(address, chainType);
        textAddr.address = String(addressTextResult);
    }

    return validateInteroperableAddress(textAddr) as InteroperableAddressText;
}

/**
 * Calculates a checksum for an `InteroperableAddress` as per ERC-7930.
 *
 * Accepts either binary or text representation and converts internally if needed.
 *
 * Implementation:
 * - Encode to hex using the canonical binary layout
 * - Hash the concatenation of: ChainType + ChainReferenceLength + ChainReference + AddressLength + Address
 *   (Version field is excluded - slice(6) removes "0x" prefix + version (2 bytes = 4 hex chars))
 * - Compute keccak256 hash
 * - Take the first 4 bytes (8 hex characters) of the hash
 * - Return as uppercase hexadecimal string (RFC 4648 Base 16 Alphabet [0-9A-F])
 *
 * The checksum is validated through ChecksumSchema.safeParse(), which returns a result.
 * If validation fails, we throw a specific error. Since we generate the checksum from
 * a hash, it will always be valid, but we validate for type safety.
 *
 * @param addr - The interoperable address (binary or text representation)
 * @returns The calculated checksum (8-character uppercase hex string)
 * @throws {Error} If the calculated checksum string doesn't match the schema (should never happen)
 */
export const calculateChecksum = (addr: InteroperableAddress): Checksum => {
    const hex = encodeAddress(addr, { format: "hex" }) as Hex;
    const hash = keccak256(`0x${hex.slice(6)}`);

    const checksumString = hash.slice(2, 10).toUpperCase();
    const result = ChecksumSchema.safeParse(checksumString);
    if (!result.success) {
        // This should never happen if the hash is correct, but validate for type safety
        throw new Error(`Invalid checksum format: ${checksumString}. ${result.error.message}`);
    }
    // After success check and throw, result.data is properly typed as Checksum
    return result.data;
};

/**
 * Validates an InteroperableAddress structure using the zod schema.
 *
 * This ensures the address conforms to EIP-7930 requirements:
 * - Valid version
 * - ChainType is valid (Uint8Array for binary, "eip155" | "solana" for text)
 * - ChainReference is valid (Uint8Array for binary, string for text, if present)
 * - Address is valid (Uint8Array for binary, string for text, if present)
 *
 * The schema normalizes chainType.binary by padding/trimming to exactly 2 bytes via transform.
 *
 * @param interopAddress - The interoperable address to validate (binary or text representation)
 * @returns The validated interoperable address
 * @throws {InvalidInteroperableAddress} If the address doesn't match the schema
 */
export const validateInteroperableAddress = (
    interopAddress: InteroperableAddress,
): InteroperableAddress => {
    const result = interoperableAddressSchema.safeParse(interopAddress);
    if (!result.success) {
        throw new InvalidInteroperableAddress(result.error);
    }

    // After success check and throw, result.data is properly typed as InteroperableAddress
    // The transform in the schema has already normalized chainType.binary
    return result.data;
};

/**
 * Validates the checksum of an InteroperableAddress against its calculated checksum.
 *
 * Accepts either binary or text representation and converts internally if needed.
 *
 * @param interopAddress - The interoperable address to validate (binary or text representation)
 * @param checksum - The checksum to validate against
 * @param options - Validation options
 * @param options.isENSName - Whether the address is an ENS name (affects error type)
 * @throws {InvalidChecksum} If the checksum is invalid for a raw address
 * @throws {ChecksumMismatchWarning} If the checksum is invalid for an ENS name
 */
export interface ValidateChecksumOptions {
    isENSName?: boolean;
}

export const validateChecksum = (
    interopAddress: InteroperableAddress,
    checksum: Checksum,
    options: ValidateChecksumOptions = {},
): void => {
    const { isENSName = false } = options;
    const calculatedChecksum = calculateChecksum(interopAddress);

    if (calculatedChecksum !== checksum) {
        if (isENSName) {
            throw new ChecksumMismatchWarning(calculatedChecksum, checksum);
        }
        throw new InvalidChecksum(calculatedChecksum, checksum);
    }
};
