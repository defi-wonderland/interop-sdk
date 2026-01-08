import { toHex } from "viem";

import { validateInteroperableAddress } from "../binary/index.js";
import {
    CHAIN_TYPE,
    CHAIN_TYPE_VALUE_TO_NAME,
    ChainTypeName,
    ChainTypeValue,
    convertToBytes,
    InteroperableAddress,
    InteroperableAddressText,
    InvalidChainNamespace,
    UnsupportedChainType,
} from "../internal.js";
import { isValidChainType } from "../name/isValidChain.js";
import {
    addressToBinary,
    addressToText,
    chainReferenceToBinary,
    chainReferenceToText,
} from "./caip350.js";

/**
 * Converts a binary interoperable address object into its CAIP-350
 * structured text representation.
 *
 * This is a synchronous function that converts the binary EIP-7930 format
 * to the structured text format used by CAIP-350.
 *
 * @param addr - The binary interoperable address to convert
 * @returns The CAIP-350 structured text representation
 * @throws {UnsupportedChainType} If the chain type is not supported
 * @example
 * ```ts
 * const addr = decodeInteroperableAddress("0x00010000010114d8da6bf26964af9d7eed9e03e53415D37aa96045");
 * const text = toText(addr);
 * // Returns: { version: 1, chainType: "eip155", chainReference: "1", address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" }
 * ```
 */
export const toText = (addr: InteroperableAddress): InteroperableAddressText => {
    const validated: InteroperableAddress = validateInteroperableAddress(addr);

    const chainTypeHex = toHex(validated.chainType) as ChainTypeValue;
    const namespace = CHAIN_TYPE_VALUE_TO_NAME[chainTypeHex];

    if (!namespace) {
        throw new UnsupportedChainType(chainTypeHex);
    }

    const result: InteroperableAddressText = {
        version: validated.version,
        chainType: namespace,
    };

    // Only include chainReference if present
    if (validated.chainReference.length > 0) {
        result.chainReference = chainReferenceToText(validated.chainReference, validated.chainType);
    }

    // Only include address if present
    if (validated.address.length > 0) {
        const addressResult = addressToText(validated.address, validated.chainType);
        result.address = String(addressResult);
    }

    return result;
};

/**
 * Converts a CAIP-350 structured text representation into the
 * binary interoperable address object.
 *
 * This is a synchronous function that converts the structured text format
 * to the binary EIP-7930 format.
 *
 * @param text - The CAIP-350 structured text representation
 * @returns The binary interoperable address object
 * @throws {InvalidChainNamespace} If the chain type is invalid
 * @example
 * ```ts
 * const text: InteroperableAddressText = {
 *   version: 1,
 *   chainType: "eip155",
 *   chainReference: "1",
 *   address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
 * };
 * const addr = toBinary(text);
 * ```
 */
export const toBinary = (text: InteroperableAddressText): InteroperableAddress => {
    const { version, chainType, chainReference, address } = text;

    if (!isValidChainType(chainType)) {
        throw new InvalidChainNamespace(chainType);
    }

    const chainTypeValue = CHAIN_TYPE[chainType];
    const chainTypeBytes: Uint8Array = convertToBytes(chainTypeValue, "hex");

    // Handle optional chainReference
    const chainReferenceBytes: Uint8Array = chainReference
        ? chainReferenceToBinary(chainReference, chainType as ChainTypeName)
        : new Uint8Array();

    // Handle optional address
    const addressBytes: Uint8Array = address
        ? addressToBinary(address, chainType as ChainTypeName)
        : new Uint8Array();

    const interopAddress: InteroperableAddress = {
        version,
        chainType: chainTypeBytes,
        chainReference: chainReferenceBytes,
        address: addressBytes,
    };

    const validated: InteroperableAddress = validateInteroperableAddress(interopAddress);
    return validated;
};
