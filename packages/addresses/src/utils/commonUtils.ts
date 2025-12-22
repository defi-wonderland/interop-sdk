import bs58 from "bs58";
import { bytesToNumber, fromHex, getAddress, isAddress, toHex } from "viem";

import type {
    Address,
    CHAIN_TYPE,
    ChainReference,
    ChainType,
    EncodedAddress,
    EncodedChainReference,
} from "../internal.js";
import {
    AddressResolutionFailed,
    BINARY_LENGTHS,
    BINARY_OFFSETS,
    ChainTypeName,
    ChainTypeValue,
    ENSLookupFailed,
    ENSNotFound,
    InvalidAddress,
    InvalidBinaryInteropAddress,
    UnsupportedChainType,
} from "../internal.js";
import { resolveAddress } from "./resolveENS.js";

/**
 * Extracts the version from a binary interop address.
 * From position 0 with length 2.
 * @param binaryAddress - The binary interop address to parse.
 * @returns The version as a number.
 */
export const parseVersion = (binaryAddress: Uint8Array): number => {
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
 * @param binaryAddress - The binary interop address to parse.
 * @returns The chain type as a Uint8Array.
 */
export const parseChainType = (binaryAddress: Uint8Array): ChainType => {
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
 * @param binaryAddress - The binary interop address to parse.
 * @returns The chain reference length as a number.
 */
export const parseChainReferenceLength = (binaryAddress: Uint8Array): number => {
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
 * @param binaryAddress - The binary interop address to parse.
 * @returns The chain reference as a Uint8Array.
 */
export const parseChainReference = (binaryAddress: Uint8Array): ChainReference => {
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
 * @param binaryAddress - The binary interop address to parse.
 * @returns The address length as a number.
 */
export const parseAddressLength = (binaryAddress: Uint8Array): number => {
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
 * @param binaryAddress - The binary interop address to parse.
 * @returns The address as a Uint8Array.
 */
export const parseAddress = (binaryAddress: Uint8Array): Address => {
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
 * Formats an address based on the chain type.
 * @param address - The address to format.
 * @param chainType - The chain type to format the address for.
 * @returns The formatted address.
 * @throws An error if the chain type is not supported.
 */
export const formatAddress = <T extends ChainTypeName>(
    address: Uint8Array,
    chainType: ChainType,
): EncodedAddress<T> => {
    const chainTypeHex = toHex(chainType);
    switch (chainTypeHex) {
        case ChainTypeValue.EIP155:
            return getAddress(toHex(address)) as EncodedAddress<T>;
        case ChainTypeValue.SOLANA:
            return bs58.encode(address) as EncodedAddress<T>;
        default:
            throw new UnsupportedChainType(chainTypeHex);
    }
};

/**
 * Formats a chain reference based on the chain type
 * @param chainReference - The chain reference to format
 * @param chainType - The chain type to format the chain reference for
 * @returns The formatted chain reference
 * @throws An error if the chain type is not supported
 */
export const formatChainReference = <T extends ChainTypeName>(
    chainReference: Uint8Array,
    chainType: ChainType,
): EncodedChainReference<T> => {
    const chainTypeHex = toHex(chainType);
    switch (chainTypeHex) {
        case ChainTypeValue.EIP155:
            return bytesToNumber(chainReference) as EncodedChainReference<T>;
        case ChainTypeValue.SOLANA:
            return bs58.encode(chainReference) as EncodedChainReference<T>;
        default:
            throw new UnsupportedChainType(chainTypeHex);
    }
};

/**
 * Converts an address to a Uint8Array based on the chain type
 * @param address - The address to convert (can be null/undefined for empty addresses)
 * @param options - The options to convert the address
 * @param options.chainType - The chain type to convert the address for
 * @param options.chainReference - The chain reference (used for ENS resolution on EVM chains)
 * @returns The converted address
 * @throws {ENSNotFound} If an ENS name cannot be resolved
 * @throws {ENSLookupFailed} If ENS lookup fails due to network or other errors
 * @throws {AddressResolutionFailed} If address resolution fails for unexpected reasons
 * @throws {InvalidAddress} If the address is invalid for the given chain type
 * @throws {UnsupportedChainType} If the chain type is not supported
 */
export const convertAddress = async (
    address: string | null | undefined,
    options: { chainType: keyof typeof CHAIN_TYPE; chainReference?: string },
): Promise<Uint8Array> => {
    // If no address is provided, return an empty Uint8Array. This is allowed by the
    // interoperable address spec, as AddressLength MAY be zero (provided that the
    // chain reference length is non-zero, which is validated elsewhere).
    if (!address) {
        return new Uint8Array();
    }

    const { chainType, chainReference } = options;

    // Resolve address (handles ENS if applicable).
    let resolvedAddress: string;
    try {
        resolvedAddress = await resolveAddress(address, chainType, chainReference);
    } catch (error) {
        // Re-throw ENS-specific errors as-is (they already have proper context)
        if (error instanceof ENSNotFound || error instanceof ENSLookupFailed) {
            throw error;
        }
        // Wrap any unexpected errors with more context
        throw new AddressResolutionFailed(
            `address "${address}" for chain type "${chainType}": ${error instanceof Error ? error.message : String(error)}`,
        );
    }

    switch (chainType) {
        case ChainTypeName.EIP155:
            // Validate as a proper Ethereum address using viem (case-insensitive).
            if (!isAddress(resolvedAddress, { strict: false })) {
                throw new InvalidAddress("EVM address must be a valid Ethereum address");
            }

            // Normalize to a checksummed address before converting to bytes.
            // https://viem.sh/docs/utilities/getAddress
            return fromHex(getAddress(resolvedAddress), "bytes");
        case ChainTypeName.SOLANA:
            const decodedAddress = bs58.decodeUnsafe(resolvedAddress);

            if (!decodedAddress) {
                throw new InvalidAddress("Solana address must be a base58 string");
            }

            return decodedAddress;
        default:
            throw new UnsupportedChainType(chainType);
    }
};
