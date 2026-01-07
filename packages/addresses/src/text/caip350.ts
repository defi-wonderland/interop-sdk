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
 * CAIP-350 helpers for working with chain references and addresses.
 *
 * These helpers are synchronous and contain no ENS or network resolution logic.
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
