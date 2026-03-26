import { describe, expect, it } from "vitest";

import type {
    AssetDiscoveryResult,
    AssetInfo,
    NetworkAssets,
} from "../../src/core/types/assetDiscovery.js";
import {
    mergeDiscoveredAssets,
    toDiscoveredAssets,
} from "../../src/core/utils/toDiscoveredAssets.js";

const USDC_ETH = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const WETH_ETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDC_ARB = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const WETH_ARB = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";

const usdcEth: AssetInfo = { address: USDC_ETH, symbol: "USDC", decimals: 6 };
const wethEth: AssetInfo = { address: WETH_ETH, symbol: "WETH", decimals: 18 };
const usdcArb: AssetInfo = { address: USDC_ARB, symbol: "USDC", decimals: 6 };
const wethArb: AssetInfo = { address: WETH_ARB, symbol: "WETH", decimals: 18 };

function result(providerId: string, ...networks: NetworkAssets[]): AssetDiscoveryResult {
    return { networks, providerId };
}

describe("toDiscoveredAssets", () => {
    const mockResult = result("test-provider", { chainId: 1, assets: [usdcEth, wethEth] });

    describe("single provider, single chain", () => {
        it("populate tokensByChain with numeric chain ID key", () => {
            const out = toDiscoveredAssets([mockResult]);

            expect(out.tokensByChain[1]).toBeDefined();
            expect(out.tokensByChain[1]).toHaveLength(2);
            expect(out.tokensByChain[1]).toContain(USDC_ETH.toLowerCase());
            expect(out.tokensByChain[1]).toContain(WETH_ETH.toLowerCase());
        });

        it("populate nested tokenMetadata keyed by chainId and lowercase address with providers", () => {
            const out = toDiscoveredAssets([mockResult]);

            expect(out.tokenMetadata[1]?.[USDC_ETH.toLowerCase()]).toEqual({
                ...usdcEth,
                providers: ["test-provider"],
            });
            expect(out.tokenMetadata[1]?.[WETH_ETH.toLowerCase()]).toEqual({
                ...wethEth,
                providers: ["test-provider"],
            });
        });

        it("populate tokensByChain keys with numeric chain IDs", () => {
            const out = toDiscoveredAssets([mockResult]);

            expect(Object.keys(out.tokensByChain).map(Number)).toEqual([1]);
        });
    });

    describe("multiple providers, overlapping chains/assets", () => {
        it("deduplicate assets by address", () => {
            const out = toDiscoveredAssets([
                result("provider-1", { chainId: 1, assets: [usdcEth] }),
                result("provider-2", { chainId: 1, assets: [usdcEth, wethEth] }),
            ]);

            expect(out.tokensByChain[1]).toHaveLength(2);
            expect(Object.keys(out.tokenMetadata[1]!)).toHaveLength(2);
        });

        it("use first-write-wins for metadata and merge providers", () => {
            const out = toDiscoveredAssets([
                result("provider-1", { chainId: 1, assets: [{ ...usdcEth, symbol: "USDC-OLD" }] }),
                result("provider-2", { chainId: 1, assets: [{ ...usdcEth, symbol: "USDC-NEW" }] }),
            ]);

            const meta = out.tokenMetadata[1]![USDC_ETH.toLowerCase()]!;
            expect(meta.symbol).toBe("USDC-OLD");
            expect(meta.providers).toEqual(["provider-1", "provider-2"]);
        });

        it("not duplicate same provider in providers array", () => {
            const out = toDiscoveredAssets([
                result(
                    "provider-1",
                    { chainId: 1, assets: [usdcEth] },
                    { chainId: 1, assets: [usdcEth] },
                ),
            ]);

            expect(out.tokenMetadata[1]![USDC_ETH.toLowerCase()]!.providers).toEqual([
                "provider-1",
            ]);
        });
    });

    describe("filterChainIds", () => {
        it("only include matching chains", () => {
            const out = toDiscoveredAssets(
                [
                    result(
                        "test-provider",
                        { chainId: 1, assets: [usdcEth] },
                        { chainId: 42161, assets: [usdcArb] },
                    ),
                ],
                [1],
            );

            expect(Object.keys(out.tokensByChain).map(Number)).toEqual([1]);
            expect(out.tokensByChain[42161]).toBeUndefined();
            expect(out.tokenMetadata[1]?.[USDC_ETH.toLowerCase()]).toBeDefined();
            expect(out.tokenMetadata[42161]).toBeUndefined();
        });

        it("return empty result when no chains match filter", () => {
            const out = toDiscoveredAssets([mockResult], [999]);

            expect(Object.keys(out.tokensByChain)).toHaveLength(0);
            expect(Object.keys(out.tokenMetadata)).toHaveLength(0);
        });
    });

    describe("empty results array", () => {
        it("return empty structure", () => {
            const out = toDiscoveredAssets([]);

            expect(out.tokensByChain).toEqual({});
            expect(out.tokenMetadata).toEqual({});
        });
    });

    describe("multiple chains", () => {
        it("have chain keys in tokensByChain", () => {
            const out = toDiscoveredAssets([
                result(
                    "test-provider",
                    { chainId: 42161, assets: [usdcArb] },
                    { chainId: 1, assets: [usdcEth] },
                ),
            ]);

            expect(
                Object.keys(out.tokensByChain)
                    .map(Number)
                    .sort((a, b) => a - b),
            ).toEqual([1, 42161]);
        });

        it("maintain separate token lists per chain", () => {
            const out = toDiscoveredAssets([
                result(
                    "test-provider",
                    { chainId: 1, assets: [usdcEth, wethEth] },
                    { chainId: 42161, assets: [usdcArb, wethArb] },
                ),
            ]);

            expect(out.tokensByChain[1]).toHaveLength(2);
            expect(out.tokensByChain[42161]).toHaveLength(2);
            expect(Object.keys(out.tokenMetadata[1]!)).toHaveLength(2);
            expect(Object.keys(out.tokenMetadata[42161]!)).toHaveLength(2);
        });
    });
});

describe("mergeDiscoveredAssets", () => {
    it("merge tokens from different chains", () => {
        const sourceA = toDiscoveredAssets([
            result("provider-a", { chainId: 1, assets: [usdcEth] }),
        ]);
        const sourceB = toDiscoveredAssets([
            result("provider-b", { chainId: 42161, assets: [usdcArb] }),
        ]);

        const merged = mergeDiscoveredAssets([sourceA, sourceB]);

        expect(
            Object.keys(merged.tokensByChain)
                .map(Number)
                .sort((a, b) => a - b),
        ).toEqual([1, 42161]);
        expect(merged.tokenMetadata[1]![USDC_ETH.toLowerCase()]!.providers).toEqual(["provider-a"]);
        expect(merged.tokenMetadata[42161]![USDC_ARB.toLowerCase()]!.providers).toEqual([
            "provider-b",
        ]);
    });

    it("merge providers for the same token", () => {
        const sourceA = toDiscoveredAssets([
            result("provider-a", { chainId: 1, assets: [usdcEth] }),
        ]);
        const sourceB = toDiscoveredAssets([
            result("provider-b", { chainId: 1, assets: [usdcEth] }),
        ]);

        const merged = mergeDiscoveredAssets([sourceA, sourceB]);

        expect(merged.tokensByChain[1]).toHaveLength(1);
        expect(merged.tokenMetadata[1]![USDC_ETH.toLowerCase()]!.providers).toEqual([
            "provider-a",
            "provider-b",
        ]);
    });

    it("use first-write-wins for metadata fields", () => {
        const sourceA = toDiscoveredAssets([
            result("provider-a", { chainId: 1, assets: [{ ...usdcEth, symbol: "USDC-FIRST" }] }),
        ]);
        const sourceB = toDiscoveredAssets([
            result("provider-b", {
                chainId: 1,
                assets: [{ ...usdcEth, symbol: "USDC-SECOND", decimals: 18 }],
            }),
        ]);

        const merged = mergeDiscoveredAssets([sourceA, sourceB]);

        expect(merged.tokenMetadata[1]![USDC_ETH.toLowerCase()]!.symbol).toBe("USDC-FIRST");
        expect(merged.tokenMetadata[1]![USDC_ETH.toLowerCase()]!.decimals).toBe(6);
    });

    it("not duplicate providers when same provider appears in multiple sources", () => {
        const sourceA = toDiscoveredAssets([
            result("provider-a", { chainId: 1, assets: [usdcEth] }),
        ]);
        const sourceB = toDiscoveredAssets([
            result("provider-a", { chainId: 1, assets: [usdcEth, wethEth] }),
        ]);

        const merged = mergeDiscoveredAssets([sourceA, sourceB]);

        expect(merged.tokenMetadata[1]![USDC_ETH.toLowerCase()]!.providers).toEqual(["provider-a"]);
    });

    it("handle empty sources array", () => {
        const merged = mergeDiscoveredAssets([]);

        expect(merged.tokensByChain).toEqual({});
        expect(merged.tokenMetadata).toEqual({});
    });
});
