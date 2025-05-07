import { createPublicClient, http } from "viem";
import * as chains from "viem/chains";
import { normalize } from "viem/ens";

import {
    CHAIN_TYPE,
    ChainTypeName,
    Checksum,
    HumanReadableAddressSchema,
    InteropAddress,
    InvalidChainNamespace,
    validateChecksum,
    validateInteropAddress,
} from "../internal.js";
import { convertToBytes } from "./convertToBytes.js";

/**
 * Parses an address string, handling both regular addresses and ENS names
 * @throws {Error} If the address is invalid or ENS lookup fails
 */
const parseAddress = async (
    chainNamespace: ChainTypeName,
    address: string,
): Promise<Uint8Array> => {
    if (!address) {
        return new Uint8Array();
    }

    switch (chainNamespace) {
        case "eip155":
            if (address.includes(".eth")) {
                try {
                    const client = createPublicClient({
                        chain: chains.mainnet,
                        transport: http(),
                    });
                    const ensAddress = await client.getEnsAddress({ name: normalize(address) });
                    if (!ensAddress) {
                        throw new Error(`ENS name not found: ${address}`);
                    }
                    return convertToBytes(ensAddress, "hex");
                } catch (error) {
                    throw new Error(
                        `Failed to resolve ENS name: ${error instanceof Error ? error.message : String(error)}`,
                    );
                }
            }
            return convertToBytes(address, "hex");
        case "solana":
            return convertToBytes(address, "base58");
        default:
            throw new InvalidChainNamespace(chainNamespace);
    }
};

/**
 * Parses a chain reference into a Uint8Array
 * @throws {Error} If the chain reference is invalid
 */
const parseChainReference = (chainNamespace: ChainTypeName, chainReference: string): Uint8Array => {
    switch (chainNamespace) {
        case "eip155":
            return convertToBytes(chainReference, "decimal");
        case "solana":
            return convertToBytes(chainReference, "base58");
        default:
            throw new InvalidChainNamespace(chainNamespace);
    }
};

/**
 * Parses a human-readable address into an InteropAddress
 * @throws {Error} If the address format is invalid or validation fails
 */
export const parseHumanReadable = async (humanReadableAddress: string): Promise<InteropAddress> => {
    const parsedHumanReadableAddress = HumanReadableAddressSchema.parse(humanReadableAddress);

    const { address, chainNamespace, chainReference, checksum } = parsedHumanReadableAddress;

    const addressBytes = address
        ? await parseAddress(chainNamespace as ChainTypeName, address)
        : new Uint8Array();
    const chainReferenceBytes = chainReference
        ? parseChainReference(chainNamespace as ChainTypeName, chainReference)
        : new Uint8Array();
    const chainTypeBytes = chainNamespace
        ? convertToBytes(CHAIN_TYPE[chainNamespace], "hex")
        : new Uint8Array();

    const interopAddress: InteropAddress = {
        version: 1,
        address: addressBytes,
        chainType: chainTypeBytes,
        chainReference: chainReferenceBytes,
    };

    validateInteropAddress(interopAddress);
    validateChecksum(interopAddress, checksum as Checksum);

    return interopAddress;
};
