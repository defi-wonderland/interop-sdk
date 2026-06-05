import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
const NATIVE_ZERO = "0x0000000000000000000000000000000000000000";
const NATIVE_EEE = "0xEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE";
const NATIVE_EEE_LOWER = NATIVE_EEE.toLowerCase();

const usdcEth: AssetInfo = { address: USDC_ETH, symbol: "USDC", decimals: 6 };
const wethEth: AssetInfo = { address: WETH_ETH, symbol: "WETH", decimals: 18 };
const usdcArb: AssetInfo = { address: USDC_ARB, symbol: "USDC", decimals: 6 };
const wethArb: AssetInfo = { address: WETH_ARB, symbol: "WETH", decimals: 18 };
const ethZero: AssetInfo = { address: NATIVE_ZERO, symbol: "ETH", decimals: 18 };
const ethEee: AssetInfo = { address: NATIVE_EEE, symbol: "ETH", decimals: 18 };

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

        it("fills missing name/logoURI from later providers", () => {
            const out = toDiscoveredAssets([
                result("provider-1", { chainId: 1, assets: [usdcEth] }),
                result("provider-2", {
                    chainId: 1,
                    assets: [{ ...usdcEth, name: "USD Coin", logoURI: "https://logo/usdc.png" }],
                }),
            ]);

            const meta = out.tokenMetadata[1]![USDC_ETH.toLowerCase()]!;
            expect(meta.name).toBe("USD Coin");
            expect(meta.logoURI).toBe("https://logo/usdc.png");
        });

        it("treats empty strings as missing and lets later providers fill name/logoURI", () => {
            const out = toDiscoveredAssets([
                result("provider-1", {
                    chainId: 1,
                    assets: [{ ...usdcEth, name: "", logoURI: "" }],
                }),
                result("provider-2", {
                    chainId: 1,
                    assets: [{ ...usdcEth, name: "USD Coin", logoURI: "https://logo/usdc.png" }],
                }),
            ]);

            const meta = out.tokenMetadata[1]![USDC_ETH.toLowerCase()]!;
            expect(meta.name).toBe("USD Coin");
            expect(meta.logoURI).toBe("https://logo/usdc.png");
        });

        it("keeps the first non-empty name/logoURI when later providers also report them", () => {
            const out = toDiscoveredAssets([
                result("provider-1", {
                    chainId: 1,
                    assets: [{ ...usdcEth, name: "USD Coin", logoURI: "https://logo/first.png" }],
                }),
                result("provider-2", {
                    chainId: 1,
                    assets: [{ ...usdcEth, name: "Different", logoURI: "https://logo/second.png" }],
                }),
            ]);

            const meta = out.tokenMetadata[1]![USDC_ETH.toLowerCase()]!;
            expect(meta.name).toBe("USD Coin");
            expect(meta.logoURI).toBe("https://logo/first.png");
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

    describe("conflicting identity metadata", () => {
        beforeEach(() => {
            vi.spyOn(console, "warn").mockImplementation(() => {});
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        // Conflict handling is shared with mergeDiscoveredAssets and tested in
        // depth there; this only covers that this entry point applies it too.
        it("drops a token when providers disagree on symbol/decimals", () => {
            const out = toDiscoveredAssets([
                result("honest", { chainId: 1, assets: [usdcEth, wethEth] }),
                result("malicious", { chainId: 1, assets: [{ ...usdcEth, symbol: "DAI" }] }),
            ]);

            expect(out.tokenMetadata[1]?.[USDC_ETH.toLowerCase()]).toBeUndefined();
            expect(out.tokensByChain[1]).not.toContain(USDC_ETH.toLowerCase());
            expect(out.tokenMetadata[1]?.[WETH_ETH.toLowerCase()]).toBeDefined();
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

    describe("native token placeholders", () => {
        it("collapses 0xEEE… and 0x000… into a single canonical entry (NATIVE_ASSET_ADDRESS)", () => {
            const out = toDiscoveredAssets([
                result("bungee", { chainId: 1, assets: [ethEee] }),
                result("across", { chainId: 1, assets: [ethZero] }),
            ]);

            expect(out.tokensByChain[1]).toEqual([NATIVE_EEE_LOWER]);
            expect(Object.keys(out.tokenMetadata[1]!)).toEqual([NATIVE_EEE_LOWER]);
            expect(out.tokenMetadata[1]![NATIVE_EEE_LOWER]!.providers).toEqual([
                "bungee",
                "across",
            ]);
            expect(out.tokenMetadata[1]![NATIVE_EEE_LOWER]!.address).toBe(NATIVE_EEE_LOWER);
        });

        it("leaves ERC-20 addresses lowercase, not canonicalized", () => {
            const out = toDiscoveredAssets([
                result("provider-a", { chainId: 1, assets: [usdcEth] }),
            ]);

            expect(out.tokensByChain[1]).toEqual([USDC_ETH.toLowerCase()]);
            expect(out.tokenMetadata[1]![USDC_ETH.toLowerCase()]!.address).toBe(USDC_ETH);
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

    it("treats empty strings as missing in cross-source merges", () => {
        const sourceA = toDiscoveredAssets([
            result("provider-a", { chainId: 1, assets: [{ ...usdcEth, name: "", logoURI: "" }] }),
        ]);
        const sourceB = toDiscoveredAssets([
            result("provider-b", {
                chainId: 1,
                assets: [{ ...usdcEth, name: "USD Coin", logoURI: "https://logo/usdc.png" }],
            }),
        ]);

        const merged = mergeDiscoveredAssets([sourceA, sourceB]);

        expect(merged.tokenMetadata[1]![USDC_ETH.toLowerCase()]!.name).toBe("USD Coin");
        expect(merged.tokenMetadata[1]![USDC_ETH.toLowerCase()]!.logoURI).toBe(
            "https://logo/usdc.png",
        );
    });

    it("fills missing name/logoURI from a later source", () => {
        const sourceA = toDiscoveredAssets([
            result("provider-a", { chainId: 1, assets: [usdcEth] }),
        ]);
        const sourceB = toDiscoveredAssets([
            result("provider-b", {
                chainId: 1,
                assets: [{ ...usdcEth, name: "USD Coin", logoURI: "https://logo/usdc.png" }],
            }),
        ]);

        const merged = mergeDiscoveredAssets([sourceA, sourceB]);

        expect(merged.tokenMetadata[1]![USDC_ETH.toLowerCase()]!.name).toBe("USD Coin");
        expect(merged.tokenMetadata[1]![USDC_ETH.toLowerCase()]!.logoURI).toBe(
            "https://logo/usdc.png",
        );
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

    it("collapses native placeholders across discovered sources", () => {
        const sourceA = toDiscoveredAssets([result("bungee", { chainId: 1, assets: [ethEee] })]);
        const sourceB = toDiscoveredAssets([result("across", { chainId: 1, assets: [ethZero] })]);

        const merged = mergeDiscoveredAssets([sourceA, sourceB]);

        expect(merged.tokensByChain[1]).toEqual([NATIVE_EEE_LOWER]);
        expect(Object.keys(merged.tokenMetadata[1]!)).toEqual([NATIVE_EEE_LOWER]);
        expect(merged.tokenMetadata[1]![NATIVE_EEE_LOWER]!.providers).toEqual(["bungee", "across"]);
    });

    describe("conflicting identity metadata", () => {
        beforeEach(() => {
            vi.spyOn(console, "warn").mockImplementation(() => {});
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it("drops a token when sources disagree on symbol, and warns", () => {
            const honest = toDiscoveredAssets([
                result("honest", { chainId: 1, assets: [usdcEth, wethEth] }),
            ]);
            const malicious = toDiscoveredAssets([
                result("malicious", { chainId: 1, assets: [{ ...usdcEth, symbol: "DAI" }] }),
            ]);

            const merged = mergeDiscoveredAssets([honest, malicious]);

            expect(merged.tokenMetadata[1]?.[USDC_ETH.toLowerCase()]).toBeUndefined();
            expect(merged.tokensByChain[1]).not.toContain(USDC_ETH.toLowerCase());
            expect(merged.tokenMetadata[1]?.[WETH_ETH.toLowerCase()]).toBeDefined();
            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining(USDC_ETH.toLowerCase()),
            );
        });

        it("drops a token when sources disagree on decimals", () => {
            const honest = toDiscoveredAssets([
                result("honest", { chainId: 1, assets: [usdcEth] }),
            ]);
            const malicious = toDiscoveredAssets([
                result("malicious", { chainId: 1, assets: [{ ...usdcEth, decimals: 18 }] }),
            ]);

            const merged = mergeDiscoveredAssets([honest, malicious]);

            expect(merged.tokenMetadata[1]?.[USDC_ETH.toLowerCase()]).toBeUndefined();
        });

        it("does not drop tokens over name/logoURI differences", () => {
            const sourceA = toDiscoveredAssets([
                result("provider-a", {
                    chainId: 1,
                    assets: [{ ...usdcEth, name: "USD Coin", logoURI: "https://logo/a.png" }],
                }),
            ]);
            const sourceB = toDiscoveredAssets([
                result("provider-b", {
                    chainId: 1,
                    assets: [{ ...usdcEth, name: "USDC Token", logoURI: "https://logo/b.png" }],
                }),
            ]);

            const merged = mergeDiscoveredAssets([sourceA, sourceB]);

            const meta = merged.tokenMetadata[1]?.[USDC_ETH.toLowerCase()];
            expect(meta?.symbol).toBe("USDC");
            expect(meta?.providers).toEqual(["provider-a", "provider-b"]);
        });

        it("drops native entries when collapsed placeholders disagree on symbol", () => {
            const sourceA = toDiscoveredAssets([
                result("bungee", { chainId: 1, assets: [ethEee] }),
            ]);
            const sourceB = toDiscoveredAssets([
                result("across", { chainId: 1, assets: [{ ...ethZero, symbol: "WETH" }] }),
            ]);

            const merged = mergeDiscoveredAssets([sourceA, sourceB]);

            expect(merged.tokenMetadata[1]?.[NATIVE_EEE_LOWER]).toBeUndefined();
            expect(merged.tokensByChain[1] ?? []).not.toContain(NATIVE_EEE_LOWER);
        });

        it("drops only the affected chain entry and removes it when left empty", () => {
            const honest = toDiscoveredAssets([
                result(
                    "honest",
                    { chainId: 1, assets: [usdcEth] },
                    { chainId: 42161, assets: [usdcArb] },
                ),
            ]);
            const malicious = toDiscoveredAssets([
                result("malicious", { chainId: 1, assets: [{ ...usdcEth, symbol: "DAI" }] }),
            ]);

            const merged = mergeDiscoveredAssets([honest, malicious]);

            expect(merged.tokensByChain[1]).toBeUndefined();
            expect(merged.tokenMetadata[1]).toBeUndefined();
            expect(merged.tokensByChain[42161]).toContain(USDC_ARB.toLowerCase());
            expect(merged.tokenMetadata[42161]?.[USDC_ARB.toLowerCase()]).toBeDefined();
        });
    });

    it("canonicalizes native placeholders from raw input keys", () => {
        const raw = {
            tokensByChain: { 1: [NATIVE_ZERO] },
            tokenMetadata: {
                1: {
                    [NATIVE_ZERO]: {
                        address: NATIVE_ZERO,
                        symbol: "ETH",
                        decimals: 18,
                        providers: ["legacy"],
                    },
                },
            },
        };

        const merged = mergeDiscoveredAssets([raw]);

        expect(merged.tokensByChain[1]).toEqual([NATIVE_EEE_LOWER]);
        expect(merged.tokenMetadata[1]![NATIVE_EEE_LOWER]).toBeDefined();
        expect(merged.tokenMetadata[1]![NATIVE_EEE_LOWER]!.address).toBe(NATIVE_EEE_LOWER);
    });
});
