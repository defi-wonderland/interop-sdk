import { Address, createPublicClient, Hex, http, namehash, parseAbi } from "viem";
import * as chains from "viem/chains";

import { decodeAddress } from "../address/index.js";
import { ChainTypeName } from "../constants/interopAddress.js";

// Standard ENS registry address (same on all networks)
const ENS_REGISTRY_ADDRESS: Address = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";

// Registry ABI for resolver lookup
const ENS_REGISTRY_ABI = parseAbi(["function resolver(bytes32 node) view returns (address)"]);

// ChainResolver ABI - direct getter takes the label string (not labelhash)
const CHAIN_RESOLVER_ABI = parseAbi([
    "function interoperableAddress(string label) view returns (bytes)",
]);

export interface ResolvedChainFromRegistry {
    chainType: ChainTypeName;
    chainReference: string;
}

// Cache resolver address promises per registry domain (essentially static, only changes if ENS record is updated)
const resolverCache = new Map<string, Promise<Address | null>>();

// Cache resolution promises per label+domain pair — deduplicates concurrent requests
const resolutionCache = new Map<string, Promise<ResolvedChainFromRegistry | null>>();

/** Clears the resolver and resolution caches. Useful for testing. */
export function clearRegistryCache(): void {
    resolverCache.clear();
    resolutionCache.clear();
}

async function getResolverAddress(registryDomain: string): Promise<Address | null> {
    const client = createPublicClient({
        chain: chains.mainnet,
        transport: http(process.env.MAINNET_RPC_URL),
    });

    const registryNode = namehash(registryDomain);
    const resolverAddress = await client.readContract({
        address: ENS_REGISTRY_ADDRESS,
        abi: ENS_REGISTRY_ABI,
        functionName: "resolver",
        args: [registryNode],
    });

    const resolverAddr = resolverAddress as Address | undefined;
    if (!resolverAddr || resolverAddr === "0x0000000000000000000000000000000000000000") {
        return null;
    }
    return resolverAddr;
}

async function resolveLabel(
    label: string,
    registryDomain: string,
): Promise<ResolvedChainFromRegistry | null> {
    const resolverAddr = await getCachedResolver(registryDomain);
    if (!resolverAddr) {
        return null;
    }

    const client = createPublicClient({
        chain: chains.mainnet,
        transport: http(process.env.MAINNET_RPC_URL),
    });

    const interopAddrBytes = await client.readContract({
        address: resolverAddr,
        abi: CHAIN_RESOLVER_ABI,
        functionName: "interoperableAddress",
        args: [label],
    });

    if (!interopAddrBytes || interopAddrBytes === "0x") {
        return null;
    }

    const decoded = decodeAddress(interopAddrBytes as Hex, { representation: "text" });
    if (decoded.chainReference == null) {
        return null;
    }
    return {
        chainType: decoded.chainType as ChainTypeName,
        chainReference: decoded.chainReference,
    };
}

function getCachedResolver(registryDomain: string): Promise<Address | null> {
    const existing = resolverCache.get(registryDomain);
    if (existing) return existing;

    const promise = getResolverAddress(registryDomain).catch((error) => {
        // Evict on error so the next call retries
        resolverCache.delete(registryDomain);
        throw error;
    });
    resolverCache.set(registryDomain, promise);
    return promise;
}

/**
 * Resolves a chain label to chainType and chainReference using an onchain ENS-based registry.
 *
 * This implements forward resolution via the ChainResolver contract:
 * 1. Gets the resolver for the registry domain (e.g., cid.eth) from ENS registry
 * 2. Calls interoperableAddress(label) on the resolver with the label string
 * 3. Decodes the returned ERC-7930 binary format
 *
 * Results are cached in memory. Concurrent calls for the same label+domain share a single
 * in-flight request. Transient errors are not cached and will be retried on the next call.
 *
 * @param label - The chain label to resolve (e.g., "optimism", "arbitrum", "base")
 * @param registryDomain - The ENS registry domain (e.g., "cid.eth", "on.eth")
 * @returns The resolved chainType and chainReference, or null if resolution fails
 *
 * @example
 * ```ts
 * // Resolve "optimism" using cid.eth registry
 * const result = await resolveChainFromRegistry("optimism", "cid.eth");
 * // result: { chainType: "eip155", chainReference: "10" }
 * ```
 */
export function resolveChainFromRegistry(
    label: string,
    registryDomain: string,
): Promise<ResolvedChainFromRegistry | null> {
    const cacheKey = `${label}:${registryDomain}`;
    const existing = resolutionCache.get(cacheKey);
    if (existing) return existing;

    const promise = resolveLabel(label, registryDomain).catch(() => {
        // Evict on error so the next call retries
        resolutionCache.delete(cacheKey);
        return null;
    });
    resolutionCache.set(cacheKey, promise);
    return promise;
}
