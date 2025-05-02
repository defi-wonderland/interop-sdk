import { fromHex } from "viem";

import type { InteropAddress, InteropAddressFields } from "../internal.js";
import {
    CHAIN_TYPE,
    convertAddress,
    convertChainReference,
    interopAddressFieldsSchema,
    ParseInteropAddressError,
    UnsupportedChainTypeError,
} from "../internal.js";

/**
 * Builds an InteropAddress from a set of parameters
 * @param params - The parameters to build the InteropAddress from
 * @param params.version - The version of the InteropAddress
 * @param params.chainType - The type of the chain eg: "eip155" or "solana"
 * @param params.chainReference - The reference of the chain, hex string for EIP-155 and base58 for Solana
 * @param params.address - The address of the InteropAddress, hex string for EIP-155 and base58 for Solana
 * @returns The InteropAddress
 * @throws An error if the parameters are invalid
 */
export const build = (params: InteropAddressFields): InteropAddress => {
    const result = interopAddressFieldsSchema.safeParse(params);

    if (!result.success) {
        throw new ParseInteropAddressError(result.error);
    }

    const { version, chainType, chainReference, address } = result.data;

    if (!CHAIN_TYPE[chainType]) {
        throw new UnsupportedChainTypeError(chainType);
    }

    return {
        version,
        chainType: fromHex(CHAIN_TYPE[chainType], "bytes"),
        chainReference: convertChainReference(chainReference, { chainType }),
        address: convertAddress(address, { chainType }),
    };
};
