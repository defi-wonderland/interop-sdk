import { createPublicClient, http } from "viem";
import * as chains from "viem/chains";
import { normalize } from "viem/ens";

import { ENSLookupFailed, ENSNotFound, ETHEREUM_COIN_TYPE, isViemChainId } from "../internal.js";

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
        throw new ENSLookupFailed(error instanceof Error ? error.message : String(error));
    }
};

/**
 * Resolves an address, handling ENS names if applicable
 * @param address - The address to resolve (can be a regular address or ENS name)
 * @param chainType - The chain type (e.g., "eip155", "solana")
 * @param chainReference - The chain reference (chain ID as string)
 * @returns The resolved address (original address if not ENS, resolved address if ENS)
 * @throws {ENSNotFound} If ENS name cannot be found
 * @throws {ENSLookupFailed} If ENS lookup fails
 */
export const resolveAddress = async (
    address: string,
    chainType: string,
    chainReference?: string,
): Promise<string> => {
    // Only resolve ENS for eip155 chains with .eth domains
    if (chainType !== "eip155" || !address.includes(".eth")) {
        return address;
    }

    return await resolveENSName(address, chainReference ?? "1");
};
