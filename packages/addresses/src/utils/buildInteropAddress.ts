import { fromHex } from "viem";

import type { InteropAddress, InteropAddressFields } from "../internal.js";
import {
    CHAIN_TYPE,
    ChainTypeName,
    convertAddress,
    interopAddressFieldsSchema,
    ParseInteropAddress,
    UnsupportedChainType,
} from "../internal.js";
import { parseChainReferenceString } from "./parseChainReference.js";

/**
 * Builds an InteropAddress from a set of parameters
 * @param params - The parameters to build the InteropAddress from
 * @param params.version - The version of the InteropAddress
 * @param params.chainType - The type of the chain eg: "eip155" or "solana"
 * @param params.chainReference - The reference of the chain, supports hex/decimal/chain labels for EIP-155 (e.g., "0x1", "1", "eth"), base58 for Solana
 * @param params.address - The address of the InteropAddress, hex string for EIP-155 and base58 for Solana (also supports ENS names for eip155)
 * @returns The InteropAddress
 * @throws An error if the parameters are invalid
 */
export const buildInteropAddress = async (
    params: InteropAddressFields,
): Promise<InteropAddress> => {
    const result = interopAddressFieldsSchema.safeParse(params);

    if (!result.success) {
        throw new ParseInteropAddress(result.error);
    }

    const { version, chainType, chainReference, address } = result.data;

    if (!CHAIN_TYPE[chainType]) {
        throw new UnsupportedChainType(chainType);
    }

    // Resolve chain reference (handles shortnames like "eth", "base")
    const chainReferenceBytes = chainReference
        ? await parseChainReferenceString(chainType as ChainTypeName, chainReference)
        : new Uint8Array();

    // Resolve + validate + convert address (handles ENS if applicable)
    const addressBytes = address
        ? await convertAddress(address, { chainType, chainReference })
        : new Uint8Array();

    return {
        version,
        chainType: fromHex(CHAIN_TYPE[chainType], "bytes"),
        chainReference: chainReferenceBytes,
        address: addressBytes,
    };
};
