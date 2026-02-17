import { toChainIdentifier } from "@wonderland/interop-addresses";

import type { AssetDiscoveryResult, AssetInfo, DiscoveredAssets } from "../internal.js";

/**
 * Convert one or more AssetDiscoveryResults into a lookup-friendly
 * DiscoveredAssets structure.
 *
 * Chain grouping uses CAIP-350 keys. Token metadata is flat (interop
 * addresses are globally unique). Addresses are kept in EIP-7930 format.
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
    const tokenMetadata: Record<string, AssetInfo> = {};

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

                tokenMetadata[addr] = {
                    address: asset.address,
                    symbol: asset.symbol,
                    decimals: asset.decimals,
                };
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
 * Deduplicates tokens by address (last-write-wins for metadata).
 *
 * @internal Used by ProviderExecutor - not exported publicly
 * @param sources - Array of DiscoveredAssets to merge
 */
export function mergeDiscoveredAssets(sources: DiscoveredAssets[]): DiscoveredAssets {
    const tokensByChain: Record<string, string[]> = {};
    const tokenMetadata: Record<string, AssetInfo> = {};

    for (const source of sources) {
        // Merge tokens by chain
        for (const [chainKey, tokens] of Object.entries(source.tokensByChain)) {
            tokensByChain[chainKey] ??= [];
            for (const token of tokens) {
                if (!tokensByChain[chainKey].includes(token)) {
                    tokensByChain[chainKey].push(token);
                }
            }
        }

        // Merge metadata (last-write-wins)
        Object.assign(tokenMetadata, source.tokenMetadata);
    }

    return {
        tokensByChain,
        tokenMetadata,
    } as DiscoveredAssets;
}
