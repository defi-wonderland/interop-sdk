import type {
    AssetDiscoveryResult,
    DiscoveredAssetInfo,
    DiscoveredAssets,
} from "../types/assetDiscovery.js";
import { isNativeAddress, toCanonicalNativeAddress } from "./token.js";

/**
 * Convert one or more AssetDiscoveryResults into a lookup-friendly
 * DiscoveredAssets structure.
 *
 * Chain grouping uses numeric chain IDs. Token metadata is nested by
 * chain ID then canonical address — native placeholders collapse to the
 * canonical EIP-7528 form so tokens reported under different sentinels
 * (e.g. `0xEEE…E` vs `0x000…0`) deduplicate across providers. Non-native
 * addresses are stored lowercase. All addresses use plain 0x format.
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
                const canonicalAddr = toCanonicalNativeAddress(asset.address, "eip155");
                const publicAddr = isNativeAddress(asset.address, "eip155")
                    ? canonicalAddr
                    : asset.address;

                if (!tokensByChain[chainId].includes(canonicalAddr)) {
                    tokensByChain[chainId].push(canonicalAddr);
                }

                const existing = tokenMetadata[chainId][canonicalAddr];
                if (existing) {
                    if (!existing.providers.includes(result.providerId)) {
                        existing.providers.push(result.providerId);
                    }
                    existing.name ??= asset.name;
                    existing.logoURI ??= asset.logoURI;
                } else {
                    tokenMetadata[chainId][canonicalAddr] = {
                        address: publicAddr,
                        symbol: asset.symbol,
                        decimals: asset.decimals,
                        name: asset.name,
                        logoURI: asset.logoURI,
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
 * Deduplicates tokens by canonical address (native placeholders collapse
 * to the canonical EIP-7528 form); merges `providers` arrays (first-write-wins
 * for symbol/decimals, first non-empty wins for name/logoURI, union for providers).
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
                const canonical = toCanonicalNativeAddress(token, "eip155");
                if (!tokensByChain[chainId].includes(canonical)) {
                    tokensByChain[chainId].push(canonical);
                }
            }
        }

        for (const [chainKeyStr, chainMeta] of Object.entries(source.tokenMetadata)) {
            const chainId = Number(chainKeyStr);
            tokenMetadata[chainId] ??= {};
            for (const [addr, meta] of Object.entries(chainMeta)) {
                const canonical = toCanonicalNativeAddress(addr, "eip155");
                const existing = tokenMetadata[chainId][canonical];
                if (existing) {
                    for (const pid of meta.providers) {
                        if (!existing.providers.includes(pid)) {
                            existing.providers.push(pid);
                        }
                    }
                    existing.name ??= meta.name;
                    existing.logoURI ??= meta.logoURI;
                } else {
                    const publicAddr = isNativeAddress(meta.address, "eip155")
                        ? canonical
                        : meta.address;
                    tokenMetadata[chainId][canonical] = {
                        ...meta,
                        address: publicAddr,
                        providers: [...meta.providers],
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
