import { describe, expect, it } from "vitest";

import { parseRoutesIntoAssets } from "../../src/protocols/lifi-intents/services/parseRoutes.js";

const mockRoutesResponse = {
    routes: [
        {
            fromChain: { chainId: "8453" },
            toChain: { chainId: "42161" },
            fromToken: {
                symbol: "USDC",
                name: "USD Coin",
                address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                decimals: 6,
            },
            toToken: {
                symbol: "USDC",
                name: "USD Coin",
                address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                decimals: 6,
            },
        },
        {
            fromChain: { chainId: "1" },
            toChain: { chainId: "8453" },
            fromToken: {
                symbol: "WETH",
                name: "Wrapped Ether",
                address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                decimals: 18,
            },
            toToken: {
                symbol: "USDC",
                name: "USD Coin",
                address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                decimals: 6,
            },
        },
    ],
};

describe("parseRoutesIntoAssets", () => {
    it("parses routes into NetworkAssets grouped by chain", () => {
        const result = parseRoutesIntoAssets(mockRoutesResponse);

        const chainIds = result.map((n) => n.chainId);
        expect(chainIds).toContain(8453);
        expect(chainIds).toContain(42161);
        expect(chainIds).toContain(1);
    });

    it("deduplicates assets on the same chain", () => {
        const dupeRoutes = {
            routes: [
                ...mockRoutesResponse.routes,
                {
                    fromChain: { chainId: "8453" },
                    toChain: { chainId: "1" },
                    fromToken: {
                        symbol: "USDC",
                        name: "USD Coin",
                        address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                        decimals: 6,
                    },
                    toToken: {
                        symbol: "WETH",
                        name: "Wrapped Ether",
                        address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                        decimals: 18,
                    },
                },
            ],
        };

        const result = parseRoutesIntoAssets(dupeRoutes);
        const baseAssets = result.find((n) => n.chainId === 8453)!.assets;
        expect(baseAssets).toHaveLength(1);
    });

    it("handles null symbol by falling back to empty string", () => {
        const addr = "0xaaaa000000000000000000000000000000000000";
        const result = parseRoutesIntoAssets({
            routes: [
                {
                    fromChain: { chainId: "1" },
                    toChain: { chainId: "8453" },
                    fromToken: { symbol: null, name: null, address: addr, decimals: 18 },
                    toToken: {
                        symbol: "USDC",
                        name: "USD Coin",
                        address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                        decimals: 6,
                    },
                },
            ],
        });

        const ethAssets = result.find((n) => n.chainId === 1)!.assets;
        const token = ethAssets.find((a) => a.address.toLowerCase() === addr)!;
        expect(token.symbol).toBe("");
    });

    it("excludes native token addresses from discovered assets", () => {
        const result = parseRoutesIntoAssets({
            routes: [
                {
                    fromChain: { chainId: "1" },
                    toChain: { chainId: "1" },
                    fromToken: {
                        symbol: "ETH",
                        name: "Ethereum",
                        address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                        decimals: 18,
                    },
                    toToken: {
                        symbol: "WETH",
                        name: "Wrapped Ether",
                        address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                        decimals: 18,
                    },
                },
            ],
        });

        const assets = result.find((n) => n.chainId === 1)!.assets;
        expect(assets).toHaveLength(1);
        expect(assets[0].symbol).toBe("WETH");
    });

    it("throws on invalid response schema", () => {
        expect(() => parseRoutesIntoAssets({ invalid: "data" })).toThrow();
    });

    it("returns empty array for empty routes", () => {
        const result = parseRoutesIntoAssets({ routes: [] });
        expect(result).toEqual([]);
    });
});
