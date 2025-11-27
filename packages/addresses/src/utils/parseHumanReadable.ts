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
 * Resolves an ENS name to an Ethereum address
 * @param ensName - The ENS name to resolve (e.g., "vitalik.eth")
 * @param chainReference - The chain reference (chain ID as string)
 * @returns The resolved Ethereum address or null if not found
 * @throws {ENSNotFound} If the ENS name cannot be found
 * @throws {ENSLookupFailed} If the ENS lookup fails due to network or other errors
 */
const resolveENSName = async (ensName: string, chainReference: string): Promise<string | null> => {
    try {
        const client = createPublicClient({
            chain: chains.mainnet,
            transport: http(),
        });

        const isMainnet = chainReference === "1";
        const chainSpecificCoinType = isMainnet
            ? ETHEREUM_COIN_TYPE
            : convertEVMChainIdToCoinType(Number(chainReference));

        const resolvedAddress = await client.getEnsAddress({
            name: normalize(ensName),
            coinType: chainSpecificCoinType,
        });

        if (!resolvedAddress && !isMainnet) {
            return await client.getEnsAddress({
                name: normalize(ensName),
                coinType: ETHEREUM_COIN_TYPE,
            });
        }

        return resolvedAddress;
    } catch (error) {
        if (error instanceof ENSNotFound) {
            throw error;
        }
        throw new ENSLookupFailed(error instanceof Error ? error.message : String(error));
    }
};

/**
 * Parses an address string, handling both regular addresses and ENS names
 * @param chainNamespace - The chain namespace (e.g., "eip155", "solana")
 * @param chainReference - The chain reference (chain ID as string)
 * @param addressOrENSName - Either a regular address or an ENS name
 * @returns The address as a Uint8Array
 * @throws {Error} If the address is invalid or ENS lookup fails
 */
const parseAddress = async (
    chainNamespace: ChainTypeName,
    chainReference: string,
    addressOrENSName: string,
): Promise<Uint8Array> => {
    if (!addressOrENSName) {
        return new Uint8Array();
    }

    switch (chainNamespace) {
        case "eip155":
            if (addressOrENSName.includes(".eth")) {
                const resolvedAddress = await resolveENSName(addressOrENSName, chainReference);
                if (!resolvedAddress) {
                    throw new ENSNotFound(addressOrENSName);
                }
                return convertToBytes(resolvedAddress, "hex");
            }
            return convertToBytes(addressOrENSName, "hex");
        case "solana":
            return convertToBytes(addressOrENSName, "base58");
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
 * @param options - Parsing options
 * @param options.validateChecksumFlag - Whether to validate the checksum if provided
 * @throws {Error} If the address format is invalid or validation fails
 */
export const parseHumanReadable = async (
    humanReadableAddress: string,
    options: ParseHumanReadableOptions = {},
): Promise<InteropAddress> => {
    const { validateChecksumFlag = true } = options;
    const parsedHumanReadableAddress =
        await HumanReadableAddressSchema.parseAsync(humanReadableAddress);

    const { address, chainNamespace, chainReference, checksum, isENSName } =
        parsedHumanReadableAddress;

    const addressBytes = address
        ? await parseAddress(chainNamespace as ChainTypeName, chainReference, address)
        : new Uint8Array();
    const chainReferenceBytes = chainReference
        ? parseChainReference(chainNamespace as ChainTypeName, chainReference)
        : new Uint8Array();
    const chainTypeBytes = chainNamespace
        ? new Uint8Array(convertToBytes(CHAIN_TYPE[chainNamespace], "hex"))
        : new Uint8Array();

    const interopAddress: InteropAddress = {
        version: 1,
        address: addressBytes,
        chainType: chainTypeBytes,
        chainReference: chainReferenceBytes,
    };

    validateInteropAddress(interopAddress);

    if (validateChecksumFlag && checksum) {
        validateChecksum(interopAddress, checksum as Checksum, {
            isENSName: Boolean(isENSName),
        });
    }

    return interopAddress;
};
