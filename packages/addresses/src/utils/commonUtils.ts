import bs58 from "bs58";
import { bytesToNumber, createPublicClient, fromHex, getAddress, http, isHex, toHex } from "viem";
import { mainnet } from "viem/chains";

import type {
    Address,
    CHAIN_TYPE,
    ChainReference,
    ChainType,
    EncodedAddress,
    EncodedChainReference,
} from "../internal.js";
import {
    BINARY_LENGTHS,
    BINARY_OFFSETS,
    ChainTypeName,
    ChainTypeValue,
    InvalidAddress,
    InvalidBinaryInteropAddress,
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
 * Formats an address based on the chain type
 * @param address - The address to format
 * @param chainType - The chain type to format the address for
 * @param options - The options to format the address
 * @param options.acceptENS - Whether to accept ENS names
 * @returns The formatted address
 * @throws An error if the chain type is not supported
 */
export const formatAddress = async <T extends ChainTypeName>(
    address: Uint8Array,
    chainType: ChainType,
    options: { acceptENS?: boolean } = {},
): Promise<EncodedAddress<T>> => {
    const { acceptENS = false } = options;
    const chainTypeHex = toHex(chainType);
    switch (chainTypeHex) {
        case ChainTypeValue.EIP155:
            const hexAddress = toHex(address);
            // FIXME: use ERC-7828 to reverse resolution of ENS addresses
            if (acceptENS) {
                const client = createPublicClient({
                    chain: mainnet,
                    transport: http(),
                });
                const ensName = await client.getEnsName({
                    address: hexAddress,
                });
                if (ensName) {
                    return ensName as EncodedAddress<T>;
                }
            }
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
 * @param address - The address to convert
 * @param options - The options to convert the address
 * @param options.chainType - The chain type to convert the address for
 * @returns The converted address
 */
export const convertAddress = (
    address: string,
    options: { chainType: keyof typeof CHAIN_TYPE },
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
