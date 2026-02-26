import { toChainIdentifier } from "@wonderland/interop-addresses";

import type {
    AssetDiscoveryResult,
    DiscoveredAssetInfo,
    DiscoveredAssets,
} from "../../internal.js";

/**
 * Convert one or more AssetDiscoveryResults into a lookup-friendly
 * DiscoveredAssets structure.
 *
 * Chain grouping uses CAIP-350 keys. Token metadata is flat (interop
 * addresses are globally unique). Addresses are kept in EIP-7930 format.
 * Each metadata entry includes a `providers` array listing which provider IDs
 * reported the asset.
 *
 * @internal Used by BaseAssetDiscoveryService - not exported publicly
 * @param results - Discovery results from one or more providers
 * @param filterChainIds - Optional numeric chain IDs to include (others are skipped)
 */
export function toDiscoveredAssets(
    results: AssetDiscoveryResult[],
    filterChainIds?: number[],
): DiscoveredAssets {
    const tokensByChain: Record<string, string[]> = {};
    const tokenMetadata: Record<string, DiscoveredAssetInfo> = {};

    for (const result of results) {
        for (const network of result.networks) {
            const { chainId, assets } = network;
            if (filterChainIds && !filterChainIds.includes(chainId)) continue;

            const key = toChainIdentifier(chainId) as string;
            tokensByChain[key] ??= [];

            for (const asset of assets) {
                const addr = asset.address;

                if (!tokensByChain[key].includes(addr)) {
                    tokensByChain[key].push(addr);
                }

                const existing = tokenMetadata[addr];
                if (existing) {
                    if (!existing.providers.includes(result.providerId)) {
                        existing.providers.push(result.providerId);
                    }
                } else {
                    tokenMetadata[addr] = {
                        address: asset.address,
                        symbol: asset.symbol,
                        decimals: asset.decimals,
                        providers: [result.providerId],
                    };
                }
            }
        }
    }

    return {
        tokensByChain,
        tokenMetadata,
    } as DiscoveredAssets;
}

/**
 * Merge multiple DiscoveredAssets into a single structure.
 *
 * Used by ProviderExecutor to combine results from multiple providers.
 * Deduplicates tokens by address; merges `providers` arrays (first-write-wins
 * for symbol/decimals, union for providers).
 *
 * @internal Used by ProviderExecutor - not exported publicly
 * @param sources - Array of DiscoveredAssets to merge
 */
export function mergeDiscoveredAssets(sources: DiscoveredAssets[]): DiscoveredAssets {
    const tokensByChain: Record<string, string[]> = {};
    const tokenMetadata: Record<string, DiscoveredAssetInfo> = {};

    for (const source of sources) {
        for (const [chainKey, tokens] of Object.entries(source.tokensByChain)) {
            tokensByChain[chainKey] ??= [];
            for (const token of tokens) {
                if (!tokensByChain[chainKey].includes(token)) {
                    tokensByChain[chainKey].push(token);
                }
            }
        }

        for (const [addr, meta] of Object.entries(source.tokenMetadata)) {
            const existing = tokenMetadata[addr];
            if (existing) {
                for (const pid of meta.providers) {
                    if (!existing.providers.includes(pid)) {
                        existing.providers.push(pid);
                    }
                }
            } else {
                tokenMetadata[addr] = { ...meta, providers: [...meta.providers] };
            }
        }
    }

    return {
        tokensByChain,
        tokenMetadata,
    } as DiscoveredAssets;
}
