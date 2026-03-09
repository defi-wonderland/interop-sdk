import type {
    AssetDiscoveryResult,
    DiscoveredAssetInfo,
    DiscoveredAssets,
} from "../types/assetDiscovery.js";

/**
 * Convert one or more AssetDiscoveryResults into a lookup-friendly
 * DiscoveredAssets structure.
 *
 * Chain grouping uses numeric chain IDs. Token metadata is nested by
 * chain ID then lowercase address to prevent cross-chain collisions.
 * All addresses use plain 0x format.
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
    const tokensByChain: Record<number, string[]> = {};
    const tokenMetadata: Record<number, Record<string, DiscoveredAssetInfo>> = {};

    for (const result of results) {
        for (const network of result.networks) {
            const { chainId, assets } = network;
            if (filterChainIds && !filterChainIds.includes(chainId)) continue;

            tokensByChain[chainId] ??= [];
            tokenMetadata[chainId] ??= {};

            for (const asset of assets) {
                const addr = asset.address;
                const addrLower = addr.toLowerCase();

                if (!tokensByChain[chainId].includes(addr)) {
                    tokensByChain[chainId].push(addr);
                }

                const existing = tokenMetadata[chainId][addrLower];
                if (existing) {
                    if (!existing.providers.includes(result.providerId)) {
                        existing.providers.push(result.providerId);
                    }
                } else {
                    tokenMetadata[chainId][addrLower] = {
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
 * Used by Aggregator to combine results from multiple providers.
 * Deduplicates tokens by address; merges `providers` arrays (first-write-wins
 * for symbol/decimals, union for providers).
 *
 * @internal Used by Aggregator - not exported publicly
 * @param sources - Array of DiscoveredAssets to merge
 */
export function mergeDiscoveredAssets(sources: DiscoveredAssets[]): DiscoveredAssets {
    const tokensByChain: Record<number, string[]> = {};
    const tokenMetadata: Record<number, Record<string, DiscoveredAssetInfo>> = {};

    for (const source of sources) {
        for (const [chainKeyStr, tokens] of Object.entries(source.tokensByChain)) {
            const chainId = Number(chainKeyStr);
            tokensByChain[chainId] ??= [];
            for (const token of tokens) {
                if (!tokensByChain[chainId].includes(token)) {
                    tokensByChain[chainId].push(token);
                }
            }
        }

        for (const [chainKeyStr, chainMeta] of Object.entries(source.tokenMetadata)) {
            const chainId = Number(chainKeyStr);
            tokenMetadata[chainId] ??= {};
            for (const [addr, meta] of Object.entries(chainMeta)) {
                const existing = tokenMetadata[chainId][addr];
                if (existing) {
                    for (const pid of meta.providers) {
                        if (!existing.providers.includes(pid)) {
                            existing.providers.push(pid);
                        }
                    }
                } else {
                    tokenMetadata[chainId][addr] = { ...meta, providers: [...meta.providers] };
                }
            }
        }
    }

    return {
        tokensByChain,
        tokenMetadata,
    } as DiscoveredAssets;
}
