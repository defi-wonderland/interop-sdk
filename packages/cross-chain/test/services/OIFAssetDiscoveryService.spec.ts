import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AssetDiscoveryFailure, OIFAssetDiscoveryService } from "../../src/internal.js";

vi.mock("axios");

describe("OIFAssetDiscoveryService", () => {
    const baseUrl = "https://api.solver.test";
    const providerId = "test-solver";

    let service: OIFAssetDiscoveryService;

    // Sample API response matching OIF spec (snake_case as returned by API)
    const mockApiResponse = {
        networks: {
            "1": {
                chain_id: 1,
                assets: [
                    {
                        address: "0x000100000101A0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                        symbol: "USDC",
                        decimals: 6,
                    },
                    {
                        address: "0x000100000101C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                        symbol: "WETH",
                        decimals: 18,
                    },
                ],
            },
            "137": {
                chain_id: 137,
                assets: [
                    {
                        address: "0x00010000018902791Bca1f2de4661ED88A30C99A7a9449Aa84174",
                        symbol: "USDC",
                        decimals: 6,
                    },
                ],
            },
        },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        service = new OIFAssetDiscoveryService({
            baseUrl,
            providerId,
        });
    });

    afterEach(() => {
        service.clearCache();
    });

    describe("getSupportedAssets", () => {
        it("should fetch and return all supported assets", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: mockApiResponse,
            });

            const result = await service.getSupportedAssets();

            expect(axios.get).toHaveBeenCalledWith(
                `${baseUrl}/api/tokens`,
                expect.objectContaining({
                    headers: { "Content-Type": "application/json" },
                }),
            );

            expect(result.networks).toHaveLength(2);
            expect(result.providerId).toBe(providerId);
            expect(result.fetchedAt).toBeGreaterThan(0);

            // Check Ethereum network (transformed to camelCase)
            const ethereum = result.networks.find((n) => n.chainId === 1);
            expect(ethereum).toBeDefined();
            expect(ethereum?.assets).toHaveLength(2);
            expect(ethereum?.assets[0]?.symbol).toBe("USDC");

            // Check Polygon network
            const polygon = result.networks.find((n) => n.chainId === 137);
            expect(polygon).toBeDefined();
            expect(polygon?.assets).toHaveLength(1);
        });

        it("should use cache on subsequent calls", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: mockApiResponse,
            });

            // First call - fetches from API
            const result1 = await service.getSupportedAssets();
            expect(axios.get).toHaveBeenCalledTimes(1);

            // Second call - should use cache
            const result2 = await service.getSupportedAssets();
            expect(axios.get).toHaveBeenCalledTimes(1); // Still 1

            // Results should be identical
            expect(result1.networks).toEqual(result2.networks);
        });

        it("should bypass cache when forceRefresh is true", async () => {
            vi.mocked(axios.get).mockResolvedValue({
                status: 200,
                data: mockApiResponse,
            });

            // First call
            await service.getSupportedAssets();
            expect(axios.get).toHaveBeenCalledTimes(1);

            // Second call with forceRefresh
            await service.getSupportedAssets({ forceRefresh: true });
            expect(axios.get).toHaveBeenCalledTimes(2);
        });

        it("should filter by chain IDs when provided", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: mockApiResponse,
            });

            const result = await service.getSupportedAssets({ chainIds: [1] });

            expect(result.networks).toHaveLength(1);
            expect(result.networks[0]?.chainId).toBe(1);
        });

        it("should throw AssetDiscoveryFailure on API error", async () => {
            vi.mocked(axios.get).mockRejectedValueOnce({
                isAxiosError: true,
                response: { data: { message: "Service unavailable" } },
                message: "Request failed",
            });

            await expect(service.getSupportedAssets()).rejects.toThrow(AssetDiscoveryFailure);
        });

        it("should throw AssetDiscoveryFailure on invalid response", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: { invalid: "response" },
            });

            await expect(service.getSupportedAssets()).rejects.toThrow(AssetDiscoveryFailure);
        });
    });

    describe("getAssetsForChain", () => {
        it("should return assets for a specific chain", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: mockApiResponse,
            });

            const result = await service.getAssetsForChain(1);

            expect(result).toBeDefined();
            expect(result?.chainId).toBe(1);
            expect(result?.assets).toHaveLength(2);
        });

        it("should return null for unsupported chain", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: mockApiResponse,
            });

            const result = await service.getAssetsForChain(999);

            expect(result).toBeNull();
        });
    });

    describe("isAssetSupported", () => {
        it("should return asset info when asset is supported", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: mockApiResponse,
            });

            const result = await service.isAssetSupported(
                1,
                "0x000100000101A0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            );

            expect(result).toBeDefined();
            expect(result?.symbol).toBe("USDC");
            expect(result?.decimals).toBe(6);
        });

        it("should be case-insensitive for address comparison", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: mockApiResponse,
            });

            const result = await service.isAssetSupported(
                1,
                "0x000100000101a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // lowercase
            );

            expect(result).toBeDefined();
            expect(result?.symbol).toBe("USDC");
        });

        it("should return null for unsupported asset", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: mockApiResponse,
            });

            const result = await service.isAssetSupported(
                1,
                "0x0001000001010000000000000000000000000000000000000000",
            );

            expect(result).toBeNull();
        });

        it("should return null for unsupported chain", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: mockApiResponse,
            });

            const result = await service.isAssetSupported(
                999,
                "0x000100000101A0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            );

            expect(result).toBeNull();
        });
    });

    describe("getSupportedChainIds", () => {
        it("should return list of supported chain IDs", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: mockApiResponse,
            });

            const result = await service.getSupportedChainIds();

            expect(result).toEqual([1, 137]);
        });
    });

    describe("caching", () => {
        it("should respect custom cache TTL", async () => {
            const shortCacheService = new OIFAssetDiscoveryService({
                baseUrl,
                providerId,
                cacheTtl: 100, // 100ms
            });

            vi.mocked(axios.get).mockResolvedValue({
                status: 200,
                data: mockApiResponse,
            });

            // First call
            await shortCacheService.getSupportedAssets();
            expect(axios.get).toHaveBeenCalledTimes(1);

            // Wait for cache to expire
            await new Promise((resolve) => setTimeout(resolve, 150));

            // Second call should fetch again
            await shortCacheService.getSupportedAssets();
            expect(axios.get).toHaveBeenCalledTimes(2);
        });
    });

    describe("custom headers", () => {
        it("should include custom headers in requests", async () => {
            const serviceWithHeaders = new OIFAssetDiscoveryService({
                baseUrl,
                providerId,
                headers: {
                    Authorization: "Bearer test-token",
                    "X-Custom-Header": "custom-value",
                },
            });

            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: mockApiResponse,
            });

            await serviceWithHeaders.getSupportedAssets();

            expect(axios.get).toHaveBeenCalledWith(
                `${baseUrl}/api/tokens`,
                expect.objectContaining({
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer test-token",
                        "X-Custom-Header": "custom-value",
                    },
                }),
            );
        });
    });
});
