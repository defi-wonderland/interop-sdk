import bs58 from "bs58";
import { bytesToNumber, fromHex, getAddress, isAddress, toHex } from "viem";

import {
    CHAIN_TYPE_VALUE_TO_NAME,
    ChainTypeName,
    ChainTypeValue,
    convertToBytes,
    EncodedAddress,
    InvalidAddress,
    UnsupportedChainType,
} from "../internal.js";

/**
 * CAIP-350 text serialization helpers for working with chain references and addresses.
 *
 * These helpers implement CAIP-350's text encoding rules, which are chainType-specific
 * (e.g., for eip155: decimal strings for chain references, hex strings with EIP-55 checksumming
 * for addresses; for solana: base58 encoding). They are synchronous and contain no ENS
 * or network resolution logic.
 */

/**
 * Converts a binary chain reference to its text representation.
 *
 * For EIP-155 chains, converts to decimal string.
 * For Solana chains, converts to base58-encoded string.
 *
 * @param chainReference - The binary chain reference bytes
 * @param chainType - The binary chain type bytes
 * @returns The text representation of the chain reference
 * @throws {UnsupportedChainType} If the chain type is not supported
 * @example
 * ```ts
 * const chainRef = fromHex("0x01", "bytes");
 * const chainType = fromHex("0x0000", "bytes");
 * const text = chainReferenceToText(chainRef, chainType);
 * // Returns: "1"
 * ```
 */
export const chainReferenceToText = (chainReference: Uint8Array, chainType: Uint8Array): string => {
    const chainTypeHex = toHex(chainType) as ChainTypeValue;
    const namespace = CHAIN_TYPE_VALUE_TO_NAME[chainTypeHex];

    if (!namespace) {
        throw new UnsupportedChainType(chainTypeHex);
    }

    switch (namespace) {
        case ChainTypeName.EIP155: {
            const asNumber = bytesToNumber(chainReference);
            return asNumber.toString(10);
        }
        case ChainTypeName.SOLANA:
            return bs58.encode(chainReference);
        default:
            throw new UnsupportedChainType(chainTypeHex);
    }
};

/**
 * Converts a text chain reference to its binary representation.
 *
 * For EIP-155 chains, parses as decimal string.
 * For Solana chains, decodes from base58-encoded string.
 *
 * @param chainReference - The text representation of the chain reference
 * @param chainNamespace - The chain namespace (e.g., "eip155", "solana")
 * @returns The binary chain reference bytes
 * @throws {UnsupportedChainType} If the chain type is not supported
 * @example
 * ```ts
 * const binary = chainReferenceToBinary("1", "eip155");
 * // Returns: Uint8Array([0x01])
 * ```
 */
export const chainReferenceToBinary = (
    chainReference: string,
    chainNamespace: ChainTypeName,
): Uint8Array => {
    switch (chainNamespace) {
        case ChainTypeName.EIP155:
            return convertToBytes(chainReference, "decimal");
        case ChainTypeName.SOLANA:
            return convertToBytes(chainReference, "base58");
        default:
            throw new UnsupportedChainType(chainNamespace);
    }
};

/**
 * Converts a binary address to its text representation.
 *
 * For EIP-155 chains, converts to EIP-55 checksummed address.
 * For Solana chains, converts to base58-encoded string.
 *
 * @param address - The binary address bytes
 * @param chainType - The binary chain type bytes
 * @returns The text representation of the address
 * @throws {UnsupportedChainType} If the chain type is not supported
 * @example
 * ```ts
 * const addr = fromHex("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "bytes");
 * const chainType = fromHex("0x0000", "bytes");
 * const text = addressToText(addr, chainType);
 * // Returns: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
 * ```
 */
export const addressToText = (
    address: Uint8Array,
    chainType: Uint8Array,
): EncodedAddress<ChainTypeName> | string => {
    const chainTypeHex = toHex(chainType) as ChainTypeValue;
    const namespace = CHAIN_TYPE_VALUE_TO_NAME[chainTypeHex];

    if (!namespace) {
        throw new UnsupportedChainType(chainTypeHex);
    }

    switch (namespace) {
        case ChainTypeName.EIP155:
            // EIP-55 checksum address
            return getAddress(toHex(address)) as EncodedAddress<ChainTypeName>;
        case ChainTypeName.SOLANA:
            return bs58.encode(address) as EncodedAddress<ChainTypeName>;
        default:
            throw new UnsupportedChainType(chainTypeHex);
    }
};

/**
 * Converts a text address to its binary representation.
 *
 * For EIP-155 chains, validates and converts from hex string (with EIP-55 checksum).
 * For Solana chains, decodes from base58-encoded string.
 *
 * @param address - The text representation of the address
 * @param chainNamespace - The chain namespace (e.g., "eip155", "solana")
 * @returns The binary address bytes
 * @throws {InvalidAddress} If the address format is invalid for the chain type
 * @throws {UnsupportedChainType} If the chain type is not supported
 * @example
 * ```ts
 * const binary = addressToBinary("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "eip155");
 * // Returns: Uint8Array with the address bytes
 * ```
 */
export const addressToBinary = (address: string, chainNamespace: ChainTypeName): Uint8Array => {
    // Empty address is allowed by the interoperable address spec.
    if (!address) {
        return new Uint8Array();
    }

    switch (chainNamespace) {
        case ChainTypeName.EIP155: {
            if (!isAddress(address, { strict: false })) {
                throw new InvalidAddress("EVM address must be a valid Ethereum address");
            }
            const checksummed = getAddress(address);
            return fromHex(checksummed, "bytes");
        }
        case ChainTypeName.SOLANA: {
            const decoded = bs58.decodeUnsafe(address);
            if (!decoded) {
                throw new InvalidAddress("Solana address must be a base58 string");
            }
            return decoded;
        }
        default:
            throw new UnsupportedChainType(chainNamespace);
    }
};
