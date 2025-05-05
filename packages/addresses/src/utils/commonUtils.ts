import bs58 from "bs58";
import { bytesToNumber, fromBytes, fromHex, getAddress, isHex, toHex } from "viem";

import type { Address, ChainReference, ChainType, ChainTypeNames } from "../internal.js";
import {
    BINARY_LENGTHS,
    BINARY_OFFSETS,
    ChainTypeName,
    ChainTypeValue,
    InvalidAddress,
    InvalidBinaryInteropAddress,
    InvalidChainReference,
    UnsupportedChainType,
} from "../internal.js";

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
        throw new InvalidBinaryInteropAddress("Invalid version length");
    }

    return Number.parseInt(fromBytes(version, "hex"), 16);
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
        throw new InvalidBinaryInteropAddress("Invalid chain type length");
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
        throw new InvalidBinaryInteropAddress("Invalid chain reference length");
    }

    return Number.parseInt(fromBytes(chainReferenceLength, "hex"), 16);
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
        throw new InvalidBinaryInteropAddress("Invalid chain reference length");
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
        throw new InvalidBinaryInteropAddress("Invalid address length");
    }

    return Number.parseInt(fromBytes(addressLength, "hex"), 16);
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
        throw new InvalidBinaryInteropAddress("Invalid address length");
    }

    return address;
};

/**
 * Formats an address based on the chain type
 * @param address - The address to format
 * @param options - The options to format the address
 * @param options.chainType - The chain type to format the address for
 * @returns The formatted address
 */
export const formatAddress = (address: Uint8Array, options: { chainType: ChainType }): string => {
    const chainTypeHex = toHex(options.chainType);
    switch (chainTypeHex) {
        case ChainTypeValue.EIP155:
            return getAddress(toHex(address));
        case ChainTypeValue.SOLANA:
            return bs58.encode(address);
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
export const formatChainReference = (chainReference: Uint8Array, chainType: ChainType): string => {
    const chainTypeHex = toHex(chainType);
    switch (chainTypeHex) {
        case ChainTypeValue.EIP155:
            return bytesToNumber(chainReference).toString();
        case ChainTypeValue.SOLANA:
            return bs58.encode(chainReference);
        default:
            throw new UnsupportedChainType(chainTypeHex);
    }
};

export const convertAddress = (
    address: string,
    options: { chainType: ChainTypeNames },
): Uint8Array => {
    switch (options.chainType) {
        case ChainTypeName.EIP155:
            if (!isHex(address)) {
                throw new InvalidAddress("EVM address must be a hex string");
            }

            return fromHex(address, "bytes");
        case ChainTypeName.SOLANA:
            const decodedAddress = bs58.decodeUnsafe(address);

            if (!decodedAddress) {
                throw new InvalidAddress("Solana address must be a base58 string");
            }

            return decodedAddress;
        default:
            throw new UnsupportedChainType(options.chainType);
    }
};

export const convertChainReference = (
    chainReference: string,
    options: { chainType: ChainTypeNames },
): Uint8Array => {
    switch (options.chainType) {
        case ChainTypeName.EIP155:
            if (!isHex(chainReference)) {
                throw new InvalidChainReference("EVM chain reference must be a hex string");
            }

            return fromHex(chainReference, "bytes");
        case ChainTypeName.SOLANA:
            const decodedChainReference = bs58.decodeUnsafe(chainReference);

            if (!decodedChainReference) {
                throw new InvalidChainReference("Solana chain reference must be a base58 string");
            }

            return decodedChainReference;
        default:
            throw new UnsupportedChainType(options.chainType);
    }
};
