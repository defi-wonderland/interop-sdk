import bs58 from "bs58";
import { bytesToNumber, getAddress, keccak256, toHex } from "viem";

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
    const chainReferenceHex = chainReference ? toHex(chainReference).slice(2) : "";
    const chainReferenceLength = (chainReferenceHex.length / 2).toString(16).padStart(2, "0");
    const addressHex = address ? toHex(address).slice(2) : "";
    const addressLength = (addressHex.length / 2).toString(16).padStart(2, "0");

    const binaryAddress =
        `${chainTypeHex}${chainReferenceLength}${chainReferenceHex}${addressLength}${addressHex}` as `0x${string}`;
    const hash = keccak256(`0x${binaryAddress}`);
    return hash.slice(2, 10).toUpperCase();
};

/**
 * Formats an address based on the chain type
 * @param address - The address to format
 * @param options - The options to format the address
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
            return toHex(address);
    }
};

const formatChainReference = (chainReference: Uint8Array, chainType: ChainType): string => {
    const chainTypeHex = toHex(chainType);
    switch (chainTypeHex) {
        case ChainTypeValue.EIP155:
            return bytesToNumber(chainReference).toString();
        case ChainTypeValue.SOLANA:
            return bs58.encode(chainReference);
        default:
            return bytesToNumber(chainReference).toString();
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
