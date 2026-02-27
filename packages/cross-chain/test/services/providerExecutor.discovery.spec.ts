import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAggregator, CrossChainProvider } from "../../src/internal.js";

// EIP-7930 test addresses
const USDC_ETH = "0x000100000101A0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const WETH_ETH = "0x000100000101C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDC_ARB = "0x00010000A4B10101af88d065e77c8cC2239327C5EDb3A432268e5831";

function createMockProvider(
    providerId: string,
    discoveryConfig: ReturnType<CrossChainProvider["getDiscoveryConfig"]> = null,
): CrossChainProvider {
    return {
        protocolName: providerId,
        providerId,
        getProviderId: vi.fn(() => providerId),
        getProtocolName: vi.fn(() => providerId),
        getQuotes: vi.fn(() => Promise.resolve([])),
        submitOrder: vi.fn(),
        getTrackingConfig: vi.fn(),
        getDiscoveryConfig: vi.fn(() => discoveryConfig),
    } as unknown as CrossChainProvider;
}

describe("Aggregator - Asset Discovery", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("discoverAssets", () => {
        it("should aggregate assets from multiple providers with provider attribution", async () => {
            const providerA = createMockProvider("across", {
                type: "static",
                config: {
                    networks: [
                        {
                            chainId: 1,
                            assets: [{ address: USDC_ETH, symbol: "USDC", decimals: 6 }],
                        },
                    ],
                },
            });

            const providerB = createMockProvider("oif", {
                type: "static",
                config: {
                    networks: [
                        {
                            chainId: 1,
                            assets: [
                                { address: USDC_ETH, symbol: "USDC", decimals: 6 },
                                { address: WETH_ETH, symbol: "WETH", decimals: 18 },
                            ],
                        },
                    ],
                },
            });

            const executor = createAggregator({
                providers: [providerA, providerB],
            });

            const result = await executor.discoverAssets();

            expect(result.tokensByChain["eip155:1"]).toHaveLength(2);
            expect(result.tokenMetadata[USDC_ETH].providers).toContain("across");
            expect(result.tokenMetadata[USDC_ETH].providers).toContain("oif");
            expect(result.tokenMetadata[WETH_ETH].providers).toEqual(["oif"]);
        });

        it("should skip providers without discovery config", async () => {
            const providerA = createMockProvider("across", {
                type: "static",
                config: {
                    networks: [
                        {
                            chainId: 1,
                            assets: [{ address: USDC_ETH, symbol: "USDC", decimals: 6 }],
                        },
                    ],
                },
            });

            const providerB = createMockProvider("no-discovery", null);

            const executor = createAggregator({
                providers: [providerA, providerB],
            });

            const result = await executor.discoverAssets();

            expect(result.tokensByChain["eip155:1"]).toHaveLength(1);
            expect(result.tokenMetadata[USDC_ETH].providers).toEqual(["across"]);
        });

        it("should return empty result when no providers support discovery", async () => {
            const providerA = createMockProvider("no-discovery-a", null);
            const providerB = createMockProvider("no-discovery-b", null);

            const executor = createAggregator({
                providers: [providerA, providerB],
            });

            const result = await executor.discoverAssets();

            expect(Object.keys(result.tokensByChain)).toHaveLength(0);
            expect(Object.keys(result.tokenMetadata)).toHaveLength(0);
        });

        it("should handle partial failures gracefully", async () => {
            const providerA = createMockProvider("across", {
                type: "static",
                config: {
                    networks: [
                        {
                            chainId: 1,
                            assets: [{ address: USDC_ETH, symbol: "USDC", decimals: 6 }],
                        },
                    ],
                },
            });

            const providerB = createMockProvider("failing", {
                type: "static",
                config: { networks: [] },
            });

            const executor = createAggregator({
                providers: [providerA, providerB],
            });

            // Sabotage the failing provider's cached service so it rejects
            const cache = (
                executor as unknown as {
                    discoveryCache: Map<string, { getSupportedAssets: () => Promise<never> }>;
                }
            ).discoveryCache;
            const failingService = cache.get("failing")!;
            vi.spyOn(failingService, "getSupportedAssets" as never).mockRejectedValue(
                new Error("boom"),
            );

            const result = await executor.discoverAssets();

            expect(result.tokensByChain["eip155:1"]).toBeDefined();
            expect(result.tokenMetadata[USDC_ETH].providers).toEqual(["across"]);
        });

        it("should deduplicate same token from same provider", async () => {
            const provider = createMockProvider("across", {
                type: "static",
                config: {
                    networks: [
                        {
                            chainId: 1,
                            assets: [
                                { address: USDC_ETH, symbol: "USDC", decimals: 6 },
                                { address: USDC_ETH, symbol: "USDC", decimals: 6 },
                            ],
                        },
                    ],
                },
            });

            const executor = createAggregator({
                providers: [provider],
            });

            const result = await executor.discoverAssets();

            expect(result.tokensByChain["eip155:1"]).toHaveLength(1);
            expect(result.tokenMetadata[USDC_ETH].providers).toEqual(["across"]);
        });
    });

    describe("getProvidersForRoute", () => {
        it("should return providers supporting both origin and destination assets", async () => {
            const provider = createMockProvider("across", {
                type: "static",
                config: {
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
                },
            });

            const executor = createAggregator({
                providers: [provider],
            });

            const providers = await executor.getProvidersForRoute({
                originAsset: USDC_ETH,
                destinationAsset: USDC_ARB,
            });

            expect(providers).toEqual(["across"]);
        });

        it("should return empty array when origin asset is unknown", async () => {
            const provider = createMockProvider("across", {
                type: "static",
                config: {
                    networks: [
                        {
                            chainId: 42161,
                            assets: [{ address: USDC_ARB, symbol: "USDC", decimals: 6 }],
                        },
                    ],
                },
            });

            const executor = createAggregator({
                providers: [provider],
            });

            const providers = await executor.getProvidersForRoute({
                originAsset: USDC_ETH,
                destinationAsset: USDC_ARB,
            });

            expect(providers).toEqual([]);
        });

        it("should return empty array when destination asset is unknown", async () => {
            const provider = createMockProvider("across", {
                type: "static",
                config: {
                    networks: [
                        {
                            chainId: 1,
                            assets: [{ address: USDC_ETH, symbol: "USDC", decimals: 6 }],
                        },
                    ],
                },
            });

            const executor = createAggregator({
                providers: [provider],
            });

            const providers = await executor.getProvidersForRoute({
                originAsset: USDC_ETH,
                destinationAsset: USDC_ARB,
            });

            expect(providers).toEqual([]);
        });

        it("should only return providers present on both sides (intersection)", async () => {
            const providerA = createMockProvider("across", {
                type: "static",
                config: {
                    networks: [
                        {
                            chainId: 1,
                            assets: [{ address: USDC_ETH, symbol: "USDC", decimals: 6 }],
                        },
                    ],
                },
            });

            const providerB = createMockProvider("oif", {
                type: "static",
                config: {
                    networks: [
                        {
                            chainId: 42161,
                            assets: [{ address: USDC_ARB, symbol: "USDC", decimals: 6 }],
                        },
                    ],
                },
            });

            const executor = createAggregator({
                providers: [providerA, providerB],
            });

            // across only has USDC_ETH, oif only has USDC_ARB
            // No single provider supports both
            const providers = await executor.getProvidersForRoute({
                originAsset: USDC_ETH,
                destinationAsset: USDC_ARB,
            });

            expect(providers).toEqual([]);
        });

        it("should return multiple providers when both support the route", async () => {
            const providerA = createMockProvider("across", {
                type: "static",
                config: {
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
                },
            });

            const providerB = createMockProvider("oif", {
                type: "static",
                config: {
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
                },
            });

            const executor = createAggregator({
                providers: [providerA, providerB],
            });

            const providers = await executor.getProvidersForRoute({
                originAsset: USDC_ETH,
                destinationAsset: USDC_ARB,
            });

            expect(providers).toContain("across");
            expect(providers).toContain("oif");
            expect(providers).toHaveLength(2);
        });
    });
});
