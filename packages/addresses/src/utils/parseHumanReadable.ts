import { createPublicClient, http } from "viem";
import * as chains from "viem/chains";
import { normalize } from "viem/ens";

import {
    CHAIN_TYPE,
    ChainTypeName,
    Checksum,
    ENSLookupFailed,
    ENSNotFound,
    ETHEREUM_COIN_TYPE,
    HumanReadableAddressSchema,
    InteropAddress,
    InvalidChainNamespace,
    validateChecksum,
    validateInteropAddress,
} from "../internal.js";
import { convertToBytes } from "./convertToBytes.js";

/**
 * Converts an EVM chain ID to a coin type, see https://docs.ens.domains/ensip/11/#specification
 * @param chainId - The EVM chain ID
 * @returns The coin type
 */
const convertEVMChainIdToCoinType = (chainId: number): number => {
    return (0x80000000 | chainId) >>> 0;
};

/**
 * Parses an address string, handling both regular addresses and ENS names
 * @throws {Error} If the address is invalid or ENS lookup fails
 */
const parseAddress = async (
    chainNamespace: ChainTypeName,
    chainReference: string,
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
                    const coinType =
                        chainReference === "1"
                            ? ETHEREUM_COIN_TYPE
                            : convertEVMChainIdToCoinType(Number(chainReference));
                    const ensAddress = await client.getEnsAddress({
                        name: normalize(address),
                        coinType,
                    });
                    if (!ensAddress) {
                        throw new ENSNotFound(address);
                    }
                    return convertToBytes(ensAddress, "hex");
                } catch (error) {
                    if (error instanceof ENSNotFound) {
                        throw error;
                    }
                    throw new ENSLookupFailed(
                        error instanceof Error ? error.message : String(error),
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

export type ParseHumanReadableOptions = {
    validateChecksumFlag?: boolean;
};

/**
 * Parses a human-readable address into an InteropAddress
 * @param humanReadableAddress - The human-readable address to parse
 * @param validateChecksumFlag - Whether to validate the checksum of the address
 * @throws {Error} If the address format is invalid or validation fails
 */
export const parseHumanReadable = async (
    humanReadableAddress: string,
    options: ParseHumanReadableOptions = {},
): Promise<InteropAddress> => {
    const { validateChecksumFlag = true } = options;
    const parsedHumanReadableAddress =
        await HumanReadableAddressSchema.parseAsync(humanReadableAddress);

    const { address, chainNamespace, chainReference, checksum } = parsedHumanReadableAddress;

    const addressBytes = address
        ? await parseAddress(chainNamespace as ChainTypeName, chainReference, address)
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
    if (validateChecksumFlag) {
        validateChecksum(interopAddress, checksum as Checksum);
    }

    return interopAddress;
};
