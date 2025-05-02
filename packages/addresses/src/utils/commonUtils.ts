import bs58 from "bs58";
import { bytesToNumber, fromBytes, fromHex, getAddress, isHex, toHex } from "viem";

import type { Address, ChainReference, ChainType, ChainTypeNames } from "../internal.js";
import {
    ChainTypeName,
    ChainTypeValue,
    InvalidAddressError,
    InvalidBinaryInteropAddressError,
    UnsupportedChainTypeError,
} from "../internal.js";

/**
 * Extracts the version from a binary interop address.
 * From position 0 with length 2.
 * @param binaryAddress - The binary interop address to parse.
 * @returns The version as a number.
 */
export const parseVersion = (binaryAddress: Uint8Array): number => {
    const VERSION_OFFSET = 0;
    const VERSION_LENGTH = 2;

    const version = binaryAddress.slice(VERSION_OFFSET, VERSION_OFFSET + VERSION_LENGTH);

    if (version.length !== VERSION_LENGTH) {
        throw new InvalidBinaryInteropAddressError("Invalid version length");
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
    const CHAIN_TYPE_OFFSET = 2;
    const CHAIN_TYPE_LENGTH = 2;

    const chainType = binaryAddress.slice(CHAIN_TYPE_OFFSET, CHAIN_TYPE_OFFSET + CHAIN_TYPE_LENGTH);

    if (chainType.length !== CHAIN_TYPE_LENGTH) {
        throw new InvalidBinaryInteropAddressError("Invalid chain type length");
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
    const CHAIN_REFERENCE_LENGTH_OFFSET = 4;
    const CHAIN_REFERENCE_LENGTH_LENGTH = 1;

    const chainReferenceLength = binaryAddress.slice(
        CHAIN_REFERENCE_LENGTH_OFFSET,
        CHAIN_REFERENCE_LENGTH_OFFSET + CHAIN_REFERENCE_LENGTH_LENGTH,
    );

    if (chainReferenceLength.length !== CHAIN_REFERENCE_LENGTH_LENGTH) {
        throw new InvalidBinaryInteropAddressError("Invalid chain reference length");
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
    const CHAIN_REFERENCE_OFFSET = 5;
    const CHAIN_REFERENCE_LENGTH = parseChainReferenceLength(binaryAddress);

    const chainReference = binaryAddress.slice(
        CHAIN_REFERENCE_OFFSET,
        CHAIN_REFERENCE_OFFSET + CHAIN_REFERENCE_LENGTH,
    );

    if (chainReference.length !== CHAIN_REFERENCE_LENGTH) {
        throw new InvalidBinaryInteropAddressError("Invalid chain reference length");
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
    const ADDRESS_LENGTH_OFFSET = 5 + parseChainReferenceLength(binaryAddress);
    const ADDRESS_LENGTH_LENGTH = 1;

    const addressLength = binaryAddress.slice(
        ADDRESS_LENGTH_OFFSET,
        ADDRESS_LENGTH_OFFSET + ADDRESS_LENGTH_LENGTH,
    );

    if (addressLength.length !== ADDRESS_LENGTH_LENGTH) {
        throw new InvalidBinaryInteropAddressError("Invalid address length");
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
    const ADDRESS_OFFSET = 6 + parseChainReferenceLength(binaryAddress);
    const ADDRESS_LENGTH = parseAddressLength(binaryAddress);

    const address = binaryAddress.slice(ADDRESS_OFFSET, ADDRESS_OFFSET + ADDRESS_LENGTH);

    if (address.length !== ADDRESS_LENGTH) {
        throw new InvalidBinaryInteropAddressError("Invalid address length");
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
            throw new UnsupportedChainTypeError(chainTypeHex);
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
            throw new UnsupportedChainTypeError(chainTypeHex);
    }
};

export const convertAddress = (
    address: string,
    options: { chainType: ChainTypeNames },
): Uint8Array => {
    switch (options.chainType) {
        case ChainTypeName.EIP155:
            if (!isHex(address)) {
                throw new InvalidAddressError("EVM address must be a hex string");
            }

            return fromHex(address, "bytes");
        case ChainTypeValue.SOLANA:
            const decodedAddress = bs58.decode(address);

            if (!decodedAddress) {
                throw new InvalidAddressError("Solana address must be a base58 string");
            }

            return decodedAddress;
        default:
            throw new UnsupportedChainTypeError(options.chainType);
    }
};

export const convertChainReference = (
    chainReference: string,
    options: { chainType: ChainTypeNames },
): Uint8Array => {
    switch (options.chainType) {
        case ChainTypeName.EIP155:
            if (!isHex(chainReference)) {
                throw new InvalidAddressError("EVM chain reference must be a hex string");
            }

            return fromHex(chainReference, "bytes");
        case ChainTypeName.SOLANA:
            const decodedChainReference = bs58.decodeUnsafe(chainReference);

            if (!decodedChainReference) {
                throw new InvalidAddressError("Solana chain reference must be a base58 string");
            }

            return decodedChainReference;
        default:
            throw new UnsupportedChainTypeError(options.chainType);
    }
};
