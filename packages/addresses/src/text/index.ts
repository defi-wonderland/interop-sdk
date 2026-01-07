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
