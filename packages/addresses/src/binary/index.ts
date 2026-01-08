import { bytesToNumber, fromBytes, fromHex, Hex, keccak256, toBytes } from "viem";

import type { Checksum } from "../types/checksum.js";
import type {
    Address,
    ChainReference,
    ChainType,
    InteroperableAddress,
} from "../types/interopAddress.js";
import {
    BINARY_LENGTHS,
    BINARY_OFFSETS,
    ChecksumMismatchWarning,
    ChecksumSchema,
    InvalidBinaryInteropAddress,
    InvalidChecksum,
    ParseInteropAddress,
} from "../internal.js";
import { interoperableAddressSchema } from "../schemas/interoperableAddress.schema.js";

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
const parseChainType = (binaryAddress: Uint8Array): ChainType => {
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
const parseChainReference = (binaryAddress: Uint8Array): ChainReference => {
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
const parseAddress = (binaryAddress: Uint8Array): Address => {
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
 * This is the canonical entry-point for decoding raw bytes into the
 * `InteroperableAddress` object used across the SDK.
 */
export const decodeInteroperableAddress = (value: Uint8Array | Hex): InteroperableAddress => {
    const bytes = typeof value === "string" ? fromHex(value, "bytes") : value;

    const version = parseVersion(bytes);
    const chainType = parseChainType(bytes);
    const chainReference = parseChainReference(bytes);
    const address = parseAddress(bytes);

    const interopAddress: InteroperableAddress = {
        version,
        chainType,
        chainReference,
        address,
    };

    return validateInteroperableAddress(interopAddress);
};

/**
 * Serializes an `InteroperableAddress` into the EIP-7930 byte layout.
 *
 * Layout (big-endian):
 * - version:              2 bytes
 * - chainType:            2 bytes
 * - chainReferenceLength: 1 byte
 * - chainReference:       N bytes
 * - addressLength:        1 byte
 * - address:              M bytes
 */
export const encodeInteroperableAddress = <T extends EncodeFormat | undefined = undefined>(
    addr: InteroperableAddress,
    opts?: { format?: T },
): FormatResult<T> => {
    const { format = "hex" } = opts ?? {};

    const validated = validateInteroperableAddress(addr);

    const versionBytes = toBytes(validated.version, { size: BINARY_LENGTHS.VERSION });
    const chainTypeBytes = validated.chainType;
    const chainReferenceBytes = validated.chainReference;
    const chainReferenceLengthBytes = toBytes(chainReferenceBytes.length, {
        size: BINARY_LENGTHS.CHAIN_REFERENCE_LENGTH,
    });
    const addressBytes = validated.address;
    const addressLengthBytes = toBytes(addressBytes.length, {
        size: BINARY_LENGTHS.ADDRESS_LENGTH,
    });

    const bytes = new Uint8Array([
        ...versionBytes,
        ...chainTypeBytes,
        ...chainReferenceLengthBytes,
        ...chainReferenceBytes,
        ...addressLengthBytes,
        ...addressBytes,
    ]);

    if (format === "bytes") {
        return bytes as FormatResult<T>;
    }

    return fromBytes(bytes, "hex") as FormatResult<T>;
};

/**
 * Calculates a checksum for an `InteroperableAddress` as per ERC-7930.
 *
 * Implementation mirrors the existing checksum logic:
 * - Encode to hex using the canonical binary layout
 * - Drop the first 3 bytes (version + first chainType byte) as in the
 *   current implementation (slice(6) on the hex string)
 * - Compute keccak256 and take the first 8 hex characters, uppercased
 *
 * The checksum is validated through ChecksumSchema.safeParse(), which returns a result.
 * If validation fails, we throw a specific error. Since we generate the checksum from
 * a hash, it will always be valid, but we validate for type safety.
 *
 * @throws {Error} If the calculated checksum string doesn't match the schema (should never happen)
 */
export const calculateChecksum = (addr: InteroperableAddress): Checksum => {
    const hex = encodeInteroperableAddress(addr, { format: "hex" }) as Hex;
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
 * This ensures the binary representation conforms to EIP-7930 requirements:
 * - Valid version
 * - ChainType is a valid Uint8Array (2 bytes, normalized via transform)
 * - ChainReference is a valid Uint8Array (up to 32 bytes)
 * - Address is a valid Uint8Array (up to 255 bytes)
 *
 * The schema normalizes chainType by padding/trimming to exactly 2 bytes via transform.
 *
 * @throws {ParseInteropAddress} If the address doesn't match the schema
 */
export const validateInteroperableAddress = (
    interopAddress: InteroperableAddress,
): InteroperableAddress => {
    const result = interoperableAddressSchema.safeParse(interopAddress);
    if (!result.success) {
        throw new ParseInteropAddress(result.error);
    }

    // After success check and throw, result.data is properly typed as InteroperableAddress
    // The transform in the schema has already normalized chainType
    return result.data;
};

/**
 * Validates the checksum of an InteroperableAddress against its calculated checksum.
 *
 * @param interopAddress - The interoperable address to validate
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
