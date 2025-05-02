import bs58 from "bs58";
import { bytesToNumber, getAddress, toHex } from "viem";

import type { ChainType, HumanReadableAddress, InteropAddress } from "../internal.js";
import { CHAIN_TYPE_VALUE_TO_NAME, ChainTypeValue } from "../constants/index.js";
import { UnsupportedChainTypeError } from "../internal.js";
import { calculateChecksum } from "./calculateChecksum.js";
import { validateInteropAddress } from "./validateInteropAddress.js";

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
const formatChainReference = (chainReference: Uint8Array, chainType: ChainType): string => {
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

/**
 * Converts an InteropAddress to a human-readable string format
 * @param addressData - The address data to convert
 * @returns A human-readable string representation of the address
 */
export const toHumanReadable = (addressData: InteropAddress): HumanReadableAddress => {
    const { chainType, chainReference, address } = validateInteropAddress(addressData);
    const formattedAddress = address.length ? formatAddress(address, { chainType }) : "";
    const chainTypeHex = toHex(chainType);
    const namespace = CHAIN_TYPE_VALUE_TO_NAME[chainTypeHex as ChainTypeValue];

    const checksum = calculateChecksum(addressData);
    const chainId = chainReference ? formatChainReference(chainReference, chainType) : "";

    return `${formattedAddress}@${namespace}:${chainId}#${checksum}`;
};
