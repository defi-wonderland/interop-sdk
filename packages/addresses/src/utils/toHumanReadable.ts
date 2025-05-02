import bs58 from "bs58";
import { bytesToNumber, getAddress, keccak256, pad, toHex } from "viem";

import type { ChainType, InteropAddress } from "../internal.js";
import { CHAIN_TYPE_MAP, ChainTypeValue } from "../constants/index.js";

/**
 * Calculates a checksum for an InteropAddress
 * @param addressData - The address data to calculate checksum for
 * @returns An 8-character uppercase hex string representing the checksum
 */
const calculateChecksum = (addressData: InteropAddress): string => {
    const { chainType, chainReference, address } = addressData;
    const chainTypeHex = toHex(chainType).slice(2);
    const chainReferenceLength = chainReference
        ? pad(toHex(chainReference.length), { size: 1 }).slice(2)
        : "";
    const chainReferenceHex = chainReference ? toHex(chainReference).slice(2) : "";
    const addressLength = pad(toHex(address.length), { size: 1 }).slice(2);
    const addressHex = address ? toHex(address).slice(2) : "";

    const binaryAddress =
        `${chainTypeHex}${chainReferenceLength}${chainReferenceHex}${addressLength}${addressHex}` as `0x${string}`;
    const hash = keccak256(`0x${binaryAddress}`);
    return hash.slice(2, 10).toUpperCase();
};

/**
 * Formats an address based on the chain type
 * @param address - The address to format
 * @param options - The options to format the address
 * @param options.chainType - The chain type to format the address for
 * @returns The formatted address
 */
const formatAddress = (address: Uint8Array, options: { chainType: ChainType }): string => {
    const chainTypeHex = toHex(options.chainType);
    switch (chainTypeHex) {
        case ChainTypeValue.EIP155:
            return getAddress(toHex(address));
        case ChainTypeValue.SOLANA:
            return bs58.encode(address);
        default:
            throw new Error(`Unsupported chain type: ${chainTypeHex}`);
    }
};

/**
 * Formats a chain reference based on the chain type
 * @param chainReference - The chain reference to format
 * @param chainType - The chain type to format the chain reference for
 * @returns The formatted chain reference
 * @throws An error if the chain type is not supported
 */
const formatChainReference = (chainReference: Uint8Array, chainType: ChainType): string => {
    const chainTypeHex = toHex(chainType);
    switch (chainTypeHex) {
        case ChainTypeValue.EIP155:
            return bytesToNumber(chainReference).toString();
        case ChainTypeValue.SOLANA:
            return bs58.encode(chainReference);
        default:
            throw new Error(`Unsupported chain type: ${chainTypeHex}`);
    }
};

/**
 * Converts an InteropAddress to a human-readable string format
 * @param addressData - The address data to convert
 * @returns A human-readable string representation of the address
 */
export const toHumanReadable = (addressData: InteropAddress): string => {
    const { chainType, chainReference, address } = addressData;
    const formattedAddress = address.length ? formatAddress(address, { chainType }) : "";
    const chainTypeHex = toHex(chainType);
    const namespace = CHAIN_TYPE_MAP[chainTypeHex];

    const checksum = calculateChecksum(addressData);
    const chainId = chainReference ? formatChainReference(chainReference, chainType) : "";

    return `${formattedAddress}@${namespace}:${chainId}#${checksum}`;
};
