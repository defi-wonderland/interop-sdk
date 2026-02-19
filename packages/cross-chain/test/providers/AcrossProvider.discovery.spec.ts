import { describe, expect, it } from "vitest";

import type { CustomApiAssetDiscoveryConfig, NetworkAssets } from "../../src/internal.js";
import {
    AcrossProvider,
    acrossTokensResponseSchema,
    AssetDiscoveryFactory,
    CustomApiAssetDiscoveryService,
} from "../../src/internal.js";

/** Helper to get the custom-api config from a mainnet AcrossProvider */
function getCustomApiConfig(provider: AcrossProvider): CustomApiAssetDiscoveryConfig["config"] {
    const config = provider.getDiscoveryConfig();
    if (config.type !== "custom-api") {
        throw new Error(`Expected custom-api config, got ${config.type}`);
    }
    return config.config;
}

describe("AcrossProvider.discovery", () => {
    describe("getDiscoveryConfig", () => {
        it("should return correct config type (custom-api)", () => {
            const provider = new AcrossProvider({
                providerId: "test-across",
            });

            const config = provider.getDiscoveryConfig();

            expect(config.type).toBe("custom-api");
        });

        it("should use correct endpoint based on mainnet apiUrl", () => {
            const provider = new AcrossProvider({
                providerId: "test-across",
                isTestnet: false,
            });

            const apiConfig = getCustomApiConfig(provider);

            expect(apiConfig.assetsEndpoint).toBe("https://app.across.to/api/swap/tokens");
        });

        it("should use static config for testnet", () => {
            const provider = new AcrossProvider({
                providerId: "test-across",
                isTestnet: true,
            });

            const config = provider.getDiscoveryConfig();

            expect(config.type).toBe("static");
            expect(config.config).toHaveProperty("networks");
        });

        it("should use custom apiUrl when provided", () => {
            const customUrl = "https://custom.across.api";
            const provider = new AcrossProvider({
                providerId: "test-across",
                apiUrl: customUrl,
            });

            const apiConfig = getCustomApiConfig(provider);

            expect(apiConfig.assetsEndpoint).toBe(`${customUrl}/swap/tokens`);
        });

        it("should not include auth headers (Across API is public)", () => {
            const provider = new AcrossProvider({
                providerId: "test-across",
            });

            const apiConfig = getCustomApiConfig(provider);

            expect(apiConfig.headers).toBeUndefined();
        });
    });

    describe("parseTokensResponse", () => {
        // Access the private static method via the config's parseResponse
        const provider = new AcrossProvider({ providerId: "test" });
        const { parseResponse } = getCustomApiConfig(provider);

        it("should correctly group tokens by chain", () => {
            const mockTokens = [
                {
                    chainId: 1,
                    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                    symbol: "USDC",
                    decimals: 6,
                    name: "USD Coin",
                },
                {
                    chainId: 1,
                    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                    symbol: "WETH",
                    decimals: 18,
                    name: "Wrapped Ether",
                },
                {
                    chainId: 137,
                    address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
                    symbol: "USDC",
                    decimals: 6,
                    name: "USD Coin",
                },
            ];

            const result: NetworkAssets[] = parseResponse(mockTokens);

            expect(result).toHaveLength(2);

            const ethereum = result.find((n: NetworkAssets) => n.chainId === 1);
            expect(ethereum?.assets).toHaveLength(2);

            const polygon = result.find((n: NetworkAssets) => n.chainId === 137);
            expect(polygon?.assets).toHaveLength(1);
        });

        it("should correctly encode addresses to EIP-7930 format", () => {
            const mockTokens = [
                {
                    chainId: 1,
                    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                    symbol: "USDC",
                    decimals: 6,
                },
            ];

            const result: NetworkAssets[] = parseResponse(mockTokens);
            const asset = result[0]?.assets[0];

            // EIP-7930 address format should include chain info
            // Format: 0x + version (2) + chainType (4) + chainReference (variable) + address
            expect(asset?.address).toMatch(/^0x/);
            expect(asset?.address.length).toBeGreaterThan(42); // Longer than plain address
        });

        it("should handle empty array", () => {
            const result: NetworkAssets[] = parseResponse([]);

            expect(result).toHaveLength(0);
        });

        it("should deduplicate tokens by address (same address on same chain)", () => {
            const mockTokens = [
                {
                    chainId: 1,
                    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                    symbol: "USDC",
                    decimals: 6,
                },
                {
                    chainId: 1,
                    address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // Same address, different case
                    symbol: "USDC.e",
                    decimals: 6,
                },
            ];

            const result: NetworkAssets[] = parseResponse(mockTokens);
            const ethereum = result.find((n: NetworkAssets) => n.chainId === 1);

            // Should only have one asset (deduplicated)
            expect(ethereum?.assets).toHaveLength(1);
            expect(ethereum?.assets[0]?.symbol).toBe("USDC"); // First one wins
        });

        it("should handle tokens with null priceUsd", () => {
            const mockTokens = [
                {
                    chainId: 1,
                    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                    symbol: "USDC",
                    decimals: 6,
                    priceUsd: null,
                },
            ];

            const result: NetworkAssets[] = parseResponse(mockTokens);

            expect(result).toHaveLength(1);
            expect(result[0]?.assets).toHaveLength(1);
        });

        it("should handle tokens with missing optional fields", () => {
            const mockTokens = [
                {
                    chainId: 1,
                    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                    symbol: "USDC",
                    decimals: 6,
                    // name, logoUrl, priceUsd all missing
                },
            ];

            const result: NetworkAssets[] = parseResponse(mockTokens);

            expect(result).toHaveLength(1);
            expect(result[0]?.assets[0]?.symbol).toBe("USDC");
        });

        it("should throw on invalid schema (missing required fields)", () => {
            const invalidTokens = [
                {
                    chainId: 1,
                    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                    // Missing symbol and decimals
                },
            ];

            expect(() => parseResponse(invalidTokens)).toThrow();
        });

        it("should throw on invalid address format", () => {
            const invalidTokens = [
                {
                    chainId: 1,
                    address: "not-a-valid-address",
                    symbol: "FAKE",
                    decimals: 6,
                },
            ];

            expect(() => parseResponse(invalidTokens)).toThrow();
        });

        it("should throw on invalid decimals (> 255)", () => {
            const invalidTokens = [
                {
                    chainId: 1,
                    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                    symbol: "FAKE",
                    decimals: 256,
                },
            ];

            expect(() => parseResponse(invalidTokens)).toThrow();
        });

        it("should throw on negative chainId", () => {
            const invalidTokens = [
                {
                    chainId: -1,
                    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                    symbol: "USDC",
                    decimals: 6,
                },
            ];

            expect(() => parseResponse(invalidTokens)).toThrow();
        });
    });

    describe("Zod schema validation", () => {
        it("should validate correct token format", () => {
            const validToken = {
                chainId: 1,
                address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                symbol: "USDC",
                decimals: 6,
            };

            const result = acrossTokensResponseSchema.safeParse([validToken]);
            expect(result.success).toBe(true);
        });

        it("should validate token with all optional fields", () => {
            const fullToken = {
                chainId: 1,
                address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                symbol: "USDC",
                decimals: 6,
                name: "USD Coin",
                logoUrl: "https://example.com/usdc.png",
                priceUsd: "1.00",
            };

            const result = acrossTokensResponseSchema.safeParse([fullToken]);
            expect(result.success).toBe(true);
        });

        it("should accept null priceUsd", () => {
            const tokenWithNullPrice = {
                chainId: 1,
                address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                symbol: "USDC",
                decimals: 6,
                priceUsd: null,
            };

            const result = acrossTokensResponseSchema.safeParse([tokenWithNullPrice]);
            expect(result.success).toBe(true);
        });

        it("should reject invalid address format (wrong length)", () => {
            const invalidToken = {
                chainId: 1,
                address: "0xA0b8699", // Too short
                symbol: "USDC",
                decimals: 6,
            };

            const result = acrossTokensResponseSchema.safeParse([invalidToken]);
            expect(result.success).toBe(false);
        });

        it("should reject address without 0x prefix (non-base58)", () => {
            const invalidToken = {
                chainId: 1,
                // Contains '0' which is not in base58 alphabet, and doesn't have 0x prefix
                address: "A0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                symbol: "USDC",
                decimals: 6,
            };

            const result = acrossTokensResponseSchema.safeParse([invalidToken]);
            expect(result.success).toBe(false);
        });

        it("should validate Solana address format (base58)", () => {
            // Solana USDC address on mainnet
            const solanaToken = {
                chainId: 34268394551451, // Solana chain ID used by Across
                address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                symbol: "USDC",
                decimals: 6,
            };

            const result = acrossTokensResponseSchema.safeParse([solanaToken]);
            expect(result.success).toBe(true);
        });

        it("should validate Solana Wrapped SOL address", () => {
            const wrappedSol = {
                chainId: 34268394551451,
                address: "So11111111111111111111111111111111111111112",
                symbol: "SOL",
                decimals: 9,
            };

            const result = acrossTokensResponseSchema.safeParse([wrappedSol]);
            expect(result.success).toBe(true);
        });

        it("should reject empty symbol", () => {
            const invalidToken = {
                chainId: 1,
                address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                symbol: "",
                decimals: 6,
            };

            const result = acrossTokensResponseSchema.safeParse([invalidToken]);
            expect(result.success).toBe(false);
        });
    });

    describe("Factory integration", () => {
        it("should create CustomApiAssetDiscoveryService from AcrossProvider config", () => {
            const provider = new AcrossProvider({ providerId: "test-across" });
            const factory = new AssetDiscoveryFactory();

            const service = factory.createService(provider);

            expect(service).toBeInstanceOf(CustomApiAssetDiscoveryService);
        });

        it("should pass custom cache TTL from factory config", () => {
            const provider = new AcrossProvider({ providerId: "test-across" });
            const factory = new AssetDiscoveryFactory({ defaultCacheTtl: 60000 });

            const service = factory.createService(provider);

            expect(service).toBeInstanceOf(CustomApiAssetDiscoveryService);
        });

        it("should use config cache TTL over factory default", () => {
            // This test verifies the factory respects config.cacheTtl
            // The actual behavior is tested in CustomApiAssetDiscoveryService tests
            const provider = new AcrossProvider({ providerId: "test-across" });
            const apiConfig = getCustomApiConfig(provider);

            // AcrossProvider doesn't set cacheTtl by default
            expect(apiConfig.cacheTtl).toBeUndefined();
        });
    });
});
