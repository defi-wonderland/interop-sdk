import { createPublicClient, http } from "viem";
import * as chains from "viem/chains";
import { normalize } from "viem/ens";

import { ChainTypeName } from "../constants/interopAddress.js";
import {
    ENSLookupFailed,
    ENSNotFound,
    ETHEREUM_COIN_TYPE,
    InvalidInteroperableName,
} from "../internal.js";
import { isViemChainId } from "./isValidChain.js";

function isENSName(address: string): boolean {
    return address.length > 0 && address.includes(".");
}

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
 * @returns The resolved Ethereum address
 * @throws {ENSNotFound} If the ENS name cannot be found
 * @throws {ENSLookupFailed} If the ENS lookup fails due to network or other errors
 */
const resolveENSName = async (ensName: string, chainReference: string): Promise<string> => {
    try {
        const client = createPublicClient({
            chain: chains.mainnet,
            transport: http(),
        });

        const chainId = Number(chainReference);
        const isMainnet = chainId === 1 || chainReference === "1";
        const knownViemChain = Number.isInteger(chainId) && isViemChainId(chainId);

        const chainSpecificCoinType =
            isMainnet || !knownViemChain
                ? ETHEREUM_COIN_TYPE
                : convertEVMChainIdToCoinType(chainId);

        const resolvedAddress = await client.getEnsAddress({
            name: normalize(ensName),
            coinType: chainSpecificCoinType,
        });

        if (!resolvedAddress && !isMainnet && knownViemChain) {
            const fallbackAddress = await client.getEnsAddress({
                name: normalize(ensName),
                coinType: ETHEREUM_COIN_TYPE,
            });
            if (!fallbackAddress) {
                throw new ENSNotFound(ensName);
            }
            return fallbackAddress;
        }

        if (!resolvedAddress) {
            throw new ENSNotFound(ensName);
        }

        return resolvedAddress;
    } catch (error) {
        if (error instanceof ENSNotFound) {
            throw error;
        }
        throw new ENSLookupFailed("Unexpected error, please try again or check your connection");
    }
};

export interface ResolvedAddress {
    address: string;
    isENS: boolean;
}

/**
 * Resolves an address, handling ENS names if applicable.
 * Also validates that ENS names have a chain reference.
 *
 * @param address - The address to resolve (can be a regular address or ENS name)
 * @param chainType - The chain type (e.g., "eip155")
 * @param chainReference - The chain reference (chain ID as string)
 * @returns The resolved address and whether it was an ENS name
 * @throws {InvalidInteroperableName} If an ENS name is provided without a chain reference
 * @throws {ENSNotFound} If ENS name cannot be found
 * @throws {ENSLookupFailed} If ENS lookup fails
 */
export const resolveAddress = async (
    address: string,
    chainType: ChainTypeName,
    chainReference: string | undefined,
): Promise<ResolvedAddress> => {
    const isENS = isENSName(address);

    // Validate ENS requirement: ENS names must have chain reference
    if (isENS && !chainReference) {
        throw new InvalidInteroperableName(
            `ENS names require a specific chain reference (e.g., @eip155:1). ` +
                `Use @<chainType>:<reference> format.`,
        );
    }

    let resolvedAddress = address;

    if (isENS) {
        // Only resolve ENS names for EIP-155 chains
        if (chainType === "eip155" && chainReference) {
            try {
                const resolved = await resolveENSName(address, chainReference);
                if (resolved) {
                    resolvedAddress = resolved;
                }
            } catch (error) {
                // Re-throw ENS errors (ENSLookupFailed, ENSNotFound) so they can be handled properly
                // Don't silently catch these - they should bubble up
                if (error instanceof ENSNotFound || error instanceof ENSLookupFailed) {
                    throw error;
                }
                // For other errors, re-throw as ENSLookupFailed
                throw new ENSLookupFailed(
                    "Unexpected error, please try again or check your connection",
                );
            }
        }
    }

    return {
        address: resolvedAddress,
        isENS,
    };
};
