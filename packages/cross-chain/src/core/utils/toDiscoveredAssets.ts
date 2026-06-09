import type { Address } from "viem";

import type { SameAssetService } from "../interfaces/sameAsset.interface.js";
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
 * Metadata merging is first-write-wins; empty symbols count as missing data
 * and are backfilled from later sources. Tokens with conflicting
 * `symbol`/`decimals` are dropped (see {@link dropConflictedTokens}), except
 * symbol disagreements at addresses the optional `sameAsset` service
 * resolves: the consumer's map already attests their identity, so they are kept.
 *
 * @internal Used by BaseAssetDiscoveryService - not exported publicly
 * @param results - Discovery results from one or more providers
 * @param filterChainIds - Optional numeric chain IDs to include (others are skipped)
 * @param sameAsset - Optional consumer-owned same-asset identity service
 */
export function toDiscoveredAssets(
    results: AssetDiscoveryResult[],
    filterChainIds?: number[],
    sameAsset?: SameAssetService,
): DiscoveredAssets {
    const tokensByChain: Record<number, string[]> = {};
    const tokenMetadata: Record<number, Record<string, DiscoveredAssetInfo>> = {};
    const conflicted = new Map<number, Set<string>>();

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
                    const isMappedAsset =
                        sameAsset?.resolve(chainId, canonicalAddr as Address) !== undefined;
                    if (isIdentityConflict(existing, asset, isMappedAsset)) {
                        markConflicted(conflicted, chainId, canonicalAddr);
                        continue;
                    }
                    if (!existing.providers.includes(result.providerId)) {
                        existing.providers.push(result.providerId);
                    }
                    existing.symbol ||= asset.symbol;
                    existing.name ||= asset.name;
                    existing.logoURI ||= asset.logoURI;
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

    dropConflictedTokens(tokensByChain, tokenMetadata, conflicted);

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
 * to the canonical EIP-7528 form); merges `providers` arrays (first non-empty
 * wins for name/logoURI, union for providers).
 *
 * Metadata merging is first-write-wins; empty symbols count as missing data
 * and are backfilled from later sources. Tokens with conflicting
 * `symbol`/`decimals` across sources are dropped (see
 * {@link dropConflictedTokens}), except symbol disagreements at addresses the
 * optional `sameAsset` service resolves: the consumer's map already attests
 * their identity, so they are kept.
 *
 * @internal Used by Aggregator - not exported publicly
 * @param sources - Array of DiscoveredAssets to merge
 * @param sameAsset - Optional consumer-owned same-asset identity service
 */
export function mergeDiscoveredAssets(
    sources: DiscoveredAssets[],
    sameAsset?: SameAssetService,
): DiscoveredAssets {
    const tokensByChain: Record<number, string[]> = {};
    const tokenMetadata: Record<number, Record<string, DiscoveredAssetInfo>> = {};
    const conflicted = new Map<number, Set<string>>();

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
                    const isMappedAsset =
                        sameAsset?.resolve(chainId, canonical as Address) !== undefined;
                    if (isIdentityConflict(existing, meta, isMappedAsset)) {
                        markConflicted(conflicted, chainId, canonical);
                        continue;
                    }
                    for (const pid of meta.providers) {
                        if (!existing.providers.includes(pid)) {
                            existing.providers.push(pid);
                        }
                    }
                    existing.symbol ||= meta.symbol;
                    existing.name ||= meta.name;
                    existing.logoURI ||= meta.logoURI;
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

    dropConflictedTokens(tokensByChain, tokenMetadata, conflicted);

    return {
        tokensByChain,
        tokenMetadata,
    } as DiscoveredAssets;
}

/**
 * Sources disagree on `symbol` or `decimals`: at least one is mislabeling the token.
 *
 * Decimals disagreements always conflict: the same-asset map attests identity,
 * not decimals. Symbol disagreements are tolerated when either side is empty
 * (missing data, backfilled by the caller) or when the address is mapped in the
 * consumer's same-asset service — identity then comes from the map, not the symbol.
 */
function isIdentityConflict(
    existing: DiscoveredAssetInfo,
    incoming: { symbol: string; decimals: number },
    isMappedAsset: boolean,
): boolean {
    if (existing.decimals !== incoming.decimals) return true;
    if (isMappedAsset || !existing.symbol || !incoming.symbol) return false;
    return existing.symbol !== incoming.symbol;
}

/** Record a (chainId, canonical address) pair as conflicted. */
function markConflicted(
    conflicted: Map<number, Set<string>>,
    chainId: number,
    canonical: string,
): void {
    let addresses = conflicted.get(chainId);
    if (!addresses) {
        addresses = new Set();
        conflicted.set(chainId, addresses);
    }
    addresses.add(canonical);
}

/**
 * Remove conflicted tokens from both lookup structures.
 *
 * There is no way to tell which source is lying, so conflicted entries are
 * dropped entirely (fail-closed): downstream treats missing metadata as
 * unknown and rejects, instead of trusting a poisoned symbol.
 */
function dropConflictedTokens(
    tokensByChain: Record<number, string[]>,
    tokenMetadata: Record<number, Record<string, DiscoveredAssetInfo>>,
    conflicted: Map<number, Set<string>>,
): void {
    for (const [chainId, addresses] of conflicted) {
        for (const canonical of addresses) {
            delete tokenMetadata[chainId]?.[canonical];
        }
        // One warning per chain, not per token, so a poisoned provider reporting
        // many conflicts can't flood the logs.
        console.warn(
            `[AssetDiscovery] Providers disagree on symbol/decimals for ${addresses.size} token(s) on chain ${chainId}; dropping them from discovery results: ${[...addresses].join(", ")}`,
        );

        const tokens = tokensByChain[chainId];
        if (tokens) {
            tokensByChain[chainId] = tokens.filter((addr) => !addresses.has(addr));
        }

        // Don't leave empty chain entries behind.
        if (tokensByChain[chainId]?.length === 0) {
            delete tokensByChain[chainId];
        }
        const chainMeta = tokenMetadata[chainId];
        if (chainMeta && Object.keys(chainMeta).length === 0) {
            delete tokenMetadata[chainId];
        }
    }
}
