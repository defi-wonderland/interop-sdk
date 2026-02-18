import { describe, expect, it } from "vitest";

import type { AssetDiscoveryResult } from "../../src/types/assetDiscovery.js";
import { mergeDiscoveredAssets, toDiscoveredAssets } from "../../src/utils/toDiscoveredAssets.js";

describe("toDiscoveredAssets", () => {
    // EIP-7930 test addresses
    const USDC_ETH = "0x000100000101A0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const WETH_ETH = "0x000100000101C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    const USDC_ARB = "0x00010000A4B10101af88d065e77c8cC2239327C5EDb3A432268e5831";
    const WETH_ARB = "0x00010000A4B1010182aF49447D8a07e3bd95BD0d56f35241523fBab1";

    const mockResult: AssetDiscoveryResult = {
        networks: [
            {
                chainId: 1,
                assets: [
                    { address: USDC_ETH, symbol: "USDC", decimals: 6 },
                    { address: WETH_ETH, symbol: "WETH", decimals: 18 },
                ],
            },
        ],
        fetchedAt: Date.now(),
        providerId: "test-provider",
    };

    describe("single provider, single chain", () => {
        it("should populate tokensByChain with CAIP-2 key", () => {
            const result = toDiscoveredAssets([mockResult]);

            expect(result.tokensByChain["eip155:1"]).toBeDefined();
            expect(result.tokensByChain["eip155:1"]).toHaveLength(2);
            expect(result.tokensByChain["eip155:1"]).toContain(USDC_ETH);
            expect(result.tokensByChain["eip155:1"]).toContain(WETH_ETH);
        });

        it("should populate flat tokenMetadata keyed by interop address with providers", () => {
            const result = toDiscoveredAssets([mockResult]);

            expect(result.tokenMetadata[USDC_ETH]).toEqual({
                address: USDC_ETH,
                symbol: "USDC",
                decimals: 6,
                providers: ["test-provider"],
            });
            expect(result.tokenMetadata[WETH_ETH]).toEqual({
                address: WETH_ETH,
                symbol: "WETH",
                decimals: 18,
                providers: ["test-provider"],
            });
        });

        it("should populate tokensByChain keys with CAIP-2 format", () => {
            const result = toDiscoveredAssets([mockResult]);

            expect(Object.keys(result.tokensByChain)).toEqual(["eip155:1"]);
        });
    });

    describe("multiple providers, overlapping chains/assets", () => {
        it("should deduplicate assets by interop address", () => {
            const provider1: AssetDiscoveryResult = {
                networks: [
                    {
                        chainId: 1,
                        assets: [{ address: USDC_ETH, symbol: "USDC", decimals: 6 }],
                    },
                ],
                fetchedAt: Date.now(),
                providerId: "provider-1",
            };

            const provider2: AssetDiscoveryResult = {
                networks: [
                    {
                        chainId: 1,
                        assets: [
                            { address: USDC_ETH, symbol: "USDC", decimals: 6 }, // duplicate
                            { address: WETH_ETH, symbol: "WETH", decimals: 18 },
                        ],
                    },
                ],
                fetchedAt: Date.now(),
                providerId: "provider-2",
            };

            const result = toDiscoveredAssets([provider1, provider2]);

            // Should only have 2 unique tokens, not 3
            expect(result.tokensByChain["eip155:1"]).toHaveLength(2);
            expect(Object.keys(result.tokenMetadata)).toHaveLength(2);
        });

        it("should use first-write-wins for metadata and merge providers", () => {
            const provider1: AssetDiscoveryResult = {
                networks: [
                    {
                        chainId: 1,
                        assets: [{ address: USDC_ETH, symbol: "USDC-OLD", decimals: 6 }],
                    },
                ],
                fetchedAt: Date.now(),
                providerId: "provider-1",
            };

            const provider2: AssetDiscoveryResult = {
                networks: [
                    {
                        chainId: 1,
                        assets: [{ address: USDC_ETH, symbol: "USDC-NEW", decimals: 6 }],
                    },
                ],
                fetchedAt: Date.now(),
                providerId: "provider-2",
            };

            const result = toDiscoveredAssets([provider1, provider2]);

            // First write wins for metadata fields
            expect(result.tokenMetadata[USDC_ETH].symbol).toBe("USDC-OLD");
            // Both providers are tracked
            expect(result.tokenMetadata[USDC_ETH].providers).toEqual(["provider-1", "provider-2"]);
        });

        it("should not duplicate same provider in providers array", () => {
            const provider1: AssetDiscoveryResult = {
                networks: [
                    {
                        chainId: 1,
                        assets: [{ address: USDC_ETH, symbol: "USDC", decimals: 6 }],
                    },
                    {
                        chainId: 1,
                        assets: [{ address: USDC_ETH, symbol: "USDC", decimals: 6 }],
                    },
                ],
                fetchedAt: Date.now(),
                providerId: "provider-1",
            };

            const result = toDiscoveredAssets([provider1]);

            expect(result.tokenMetadata[USDC_ETH].providers).toEqual(["provider-1"]);
        });
    });

    describe("filterChainIds", () => {
        it("should only include matching chains", () => {
            const multiChainResult: AssetDiscoveryResult = {
                networks: [
                    {
                        chainId: 1,
                        assets: [{ address: USDC_ETH, symbol: "USDC", decimals: 6 }],
                    },
                    {
                        chainId: 42161,
                        assets: [{ address: USDC_ARB, symbol: "USDC", decimals: 6 }],
                    },
                ],
                fetchedAt: Date.now(),
                providerId: "test-provider",
            };

            const result = toDiscoveredAssets([multiChainResult], [1]);

            expect(Object.keys(result.tokensByChain)).toEqual(["eip155:1"]);
            expect(result.tokensByChain["eip155:1"]).toBeDefined();
            expect(result.tokensByChain["eip155:42161"]).toBeUndefined();
            expect(result.tokenMetadata[USDC_ETH]).toBeDefined();
            expect(result.tokenMetadata[USDC_ARB]).toBeUndefined();
        });

        it("should return empty result when no chains match filter", () => {
            const result = toDiscoveredAssets([mockResult], [999]);

            expect(Object.keys(result.tokensByChain)).toHaveLength(0);
            expect(Object.keys(result.tokenMetadata)).toHaveLength(0);
        });
    });

    describe("empty results array", () => {
        it("should return empty structure", () => {
            const result = toDiscoveredAssets([]);

            expect(result.tokensByChain).toEqual({});
            expect(result.tokenMetadata).toEqual({});
        });
    });

    describe("multiple chains", () => {
        it("should have chain keys in tokensByChain", () => {
            const multiChainResult: AssetDiscoveryResult = {
                networks: [
                    {
                        chainId: 42161, // Arbitrum
                        assets: [{ address: USDC_ARB, symbol: "USDC", decimals: 6 }],
                    },
                    {
                        chainId: 1, // Ethereum
                        assets: [{ address: USDC_ETH, symbol: "USDC", decimals: 6 }],
                    },
                ],
                fetchedAt: Date.now(),
                providerId: "test-provider",
            };

            const result = toDiscoveredAssets([multiChainResult]);

            expect(Object.keys(result.tokensByChain).sort()).toEqual(["eip155:1", "eip155:42161"]);
        });

        it("should maintain separate token lists per chain", () => {
            const multiChainResult: AssetDiscoveryResult = {
                networks: [
                    {
                        chainId: 1,
                        assets: [
                            { address: USDC_ETH, symbol: "USDC", decimals: 6 },
                            { address: WETH_ETH, symbol: "WETH", decimals: 18 },
                        ],
                    },
                    {
                        chainId: 42161,
                        assets: [
                            { address: USDC_ARB, symbol: "USDC", decimals: 6 },
                            { address: WETH_ARB, symbol: "WETH", decimals: 18 },
                        ],
                    },
                ],
                fetchedAt: Date.now(),
                providerId: "test-provider",
            };

            const result = toDiscoveredAssets([multiChainResult]);

            expect(result.tokensByChain["eip155:1"]).toHaveLength(2);
            expect(result.tokensByChain["eip155:42161"]).toHaveLength(2);

            // Flat metadata should have all 4 tokens
            expect(Object.keys(result.tokenMetadata)).toHaveLength(4);
        });
    });
});

describe("mergeDiscoveredAssets", () => {
    const USDC_ETH = "0x000100000101A0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const WETH_ETH = "0x000100000101C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    const USDC_ARB = "0x00010000A4B10101af88d065e77c8cC2239327C5EDb3A432268e5831";

    it("should merge tokens from different chains", () => {
        const sourceA = toDiscoveredAssets([
            {
                networks: [
                    {
                        chainId: 1,
                        assets: [{ address: USDC_ETH, symbol: "USDC", decimals: 6 }],
                    },
                ],
                fetchedAt: Date.now(),
                providerId: "provider-a",
            },
        ]);

        const sourceB = toDiscoveredAssets([
            {
                networks: [
                    {
                        chainId: 42161,
                        assets: [{ address: USDC_ARB, symbol: "USDC", decimals: 6 }],
                    },
                ],
                fetchedAt: Date.now(),
                providerId: "provider-b",
            },
        ]);

        const merged = mergeDiscoveredAssets([sourceA, sourceB]);

        expect(Object.keys(merged.tokensByChain).sort()).toEqual(["eip155:1", "eip155:42161"]);
        expect(merged.tokenMetadata[USDC_ETH].providers).toEqual(["provider-a"]);
        expect(merged.tokenMetadata[USDC_ARB].providers).toEqual(["provider-b"]);
    });

    it("should merge providers for the same token", () => {
        const sourceA = toDiscoveredAssets([
            {
                networks: [
                    {
                        chainId: 1,
                        assets: [{ address: USDC_ETH, symbol: "USDC", decimals: 6 }],
                    },
                ],
                fetchedAt: Date.now(),
                providerId: "provider-a",
            },
        ]);

        const sourceB = toDiscoveredAssets([
            {
                networks: [
                    {
                        chainId: 1,
                        assets: [{ address: USDC_ETH, symbol: "USDC", decimals: 6 }],
                    },
                ],
                fetchedAt: Date.now(),
                providerId: "provider-b",
            },
        ]);

        const merged = mergeDiscoveredAssets([sourceA, sourceB]);

        expect(merged.tokensByChain["eip155:1"]).toHaveLength(1);
        expect(merged.tokenMetadata[USDC_ETH].providers).toEqual(["provider-a", "provider-b"]);
    });

    it("should use first-write-wins for metadata fields", () => {
        const sourceA = toDiscoveredAssets([
            {
                networks: [
                    {
                        chainId: 1,
                        assets: [{ address: USDC_ETH, symbol: "USDC-FIRST", decimals: 6 }],
                    },
                ],
                fetchedAt: Date.now(),
                providerId: "provider-a",
            },
        ]);

        const sourceB = toDiscoveredAssets([
            {
                networks: [
                    {
                        chainId: 1,
                        assets: [{ address: USDC_ETH, symbol: "USDC-SECOND", decimals: 18 }],
                    },
                ],
                fetchedAt: Date.now(),
                providerId: "provider-b",
            },
        ]);

        const merged = mergeDiscoveredAssets([sourceA, sourceB]);

        expect(merged.tokenMetadata[USDC_ETH].symbol).toBe("USDC-FIRST");
        expect(merged.tokenMetadata[USDC_ETH].decimals).toBe(6);
    });

    it("should not duplicate providers when same provider appears in multiple sources", () => {
        const sourceA = toDiscoveredAssets([
            {
                networks: [
                    {
                        chainId: 1,
                        assets: [{ address: USDC_ETH, symbol: "USDC", decimals: 6 }],
                    },
                ],
                fetchedAt: Date.now(),
                providerId: "provider-a",
            },
        ]);

        const sourceB = toDiscoveredAssets([
            {
                networks: [
                    {
                        chainId: 1,
                        assets: [
                            { address: USDC_ETH, symbol: "USDC", decimals: 6 },
                            { address: WETH_ETH, symbol: "WETH", decimals: 18 },
                        ],
                    },
                ],
                fetchedAt: Date.now(),
                providerId: "provider-a",
            },
        ]);

        const merged = mergeDiscoveredAssets([sourceA, sourceB]);

        expect(merged.tokenMetadata[USDC_ETH].providers).toEqual(["provider-a"]);
    });

    it("should handle empty sources array", () => {
        const merged = mergeDiscoveredAssets([]);

        expect(merged.tokensByChain).toEqual({});
        expect(merged.tokenMetadata).toEqual({});
    });
});
