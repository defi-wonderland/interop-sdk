import { toChainIdentifier } from "@wonderland/interop-addresses";
import axios, { AxiosError } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

import {
    AssetDiscoveryFailure,
    CustomApiAssetDiscoveryService,
    NetworkAssets,
} from "../../src/internal.js";

vi.mock("axios");

describe("CustomApiAssetDiscoveryService", () => {
    const assetsEndpoint = "https://api.custom.test/tokens";
    const providerId = "test-provider";

    let service: CustomApiAssetDiscoveryService;

    const mockApiResponse = [
        {
            chainId: 1,
            address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            symbol: "USDC",
            decimals: 6,
        },
        {
            chainId: 1,
            address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            symbol: "WETH",
            decimals: 18,
        },
        {
            chainId: 137,
            address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
            symbol: "USDC",
            decimals: 6,
        },
    ];

    const mockParseResponse = vi.fn((data: unknown): NetworkAssets[] => {
        // Simple grouping for tests
        const tokens = data as typeof mockApiResponse;
        const chainMap = new Map<number, NetworkAssets>();

        for (const token of tokens) {
            if (!chainMap.has(token.chainId)) {
                chainMap.set(token.chainId, { chainId: token.chainId, assets: [] });
            }
            chainMap.get(token.chainId)!.assets.push({
                address: token.address as `0x${string}`,
                symbol: token.symbol,
                decimals: token.decimals,
            });
        }

        return Array.from(chainMap.values());
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockParseResponse.mockClear();
        service = new CustomApiAssetDiscoveryService({
            assetsEndpoint,
            parseResponse: mockParseResponse,
            providerId,
        });
    });

    afterEach(() => {
        service.clearCache();
    });

    describe("getSupportedAssets", () => {
        it("should fetch and return DiscoveredAssets", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: mockApiResponse,
            });

            const result = await service.getSupportedAssets();

            expect(axios.get).toHaveBeenCalledWith(assetsEndpoint, expect.anything());

            // Returns DiscoveredAssets format
            expect(Object.keys(result.tokensByChain)).toHaveLength(2);
            expect(Object.keys(result.tokensByChain)).toContain(toChainIdentifier(1));
            expect(Object.keys(result.tokensByChain)).toContain(toChainIdentifier(137));

            // Verify tokensByChain has the expected tokens
            const ethTokens = result.tokensByChain[toChainIdentifier(1) as string];
            expect(ethTokens).toHaveLength(2);
        });

        it("should use cache on subsequent calls", async () => {
            vi.mocked(axios.get).mockResolvedValue({
                status: 200,
                data: mockApiResponse,
            });

            // First call - fetches from API
            await service.getSupportedAssets();
            expect(axios.get).toHaveBeenCalledTimes(1);

            // Second call - should use cache
            await service.getSupportedAssets();
            expect(axios.get).toHaveBeenCalledTimes(1);
        });

        it("should bypass cache with forceRefresh: true", async () => {
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

        it("should filter by chain IDs", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: mockApiResponse,
            });

            const result = await service.getSupportedAssets({ chainIds: [1] });

            expect(Object.keys(result.tokensByChain)).toHaveLength(1);
            expect(Object.keys(result.tokensByChain)).toContain(toChainIdentifier(1));
        });

        it("should handle empty response array", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: [],
            });
            mockParseResponse.mockReturnValueOnce([]);

            const result = await service.getSupportedAssets();

            expect(Object.keys(result.tokensByChain)).toHaveLength(0);
        });

        it("should include custom headers in requests", async () => {
            const customHeaders = { Authorization: "Bearer test-token" };
            const serviceWithHeaders = new CustomApiAssetDiscoveryService({
                assetsEndpoint,
                parseResponse: mockParseResponse,
                providerId,
                headers: customHeaders,
            });

            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: mockApiResponse,
            });

            await serviceWithHeaders.getSupportedAssets();

            expect(axios.get).toHaveBeenCalledWith(
                assetsEndpoint,
                expect.objectContaining({
                    headers: {
                        Authorization: "Bearer test-token",
                    },
                }),
            );
        });
    });

    describe("getAssetsForChain", () => {
        it("should return assets for supported chain", async () => {
            vi.mocked(axios.get).mockResolvedValue({
                status: 200,
                data: mockApiResponse,
            });

            const result = await service.getAssetsForChain(1);

            expect(result?.chainId).toBe(1);
            expect(result?.assets).toHaveLength(2);
        });

        it("should return null for unsupported chain", async () => {
            vi.mocked(axios.get).mockResolvedValue({
                status: 200,
                data: mockApiResponse,
            });

            const result = await service.getAssetsForChain(999);

            expect(result).toBeNull();
        });
    });

    describe("isAssetSupported", () => {
        it("should find asset with case-insensitive address comparison", async () => {
            vi.mocked(axios.get).mockResolvedValue({
                status: 200,
                data: mockApiResponse,
            });

            // Uppercase (as stored)
            const upper = await service.isAssetSupported(
                1,
                "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            );
            expect(upper?.symbol).toBe("USDC");

            // Lowercase (user might provide)
            const lower = await service.isAssetSupported(
                1,
                "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            );
            expect(lower?.symbol).toBe("USDC");
        });

        it("should return null for non-existent asset", async () => {
            vi.mocked(axios.get).mockResolvedValue({
                status: 200,
                data: mockApiResponse,
            });

            const result = await service.isAssetSupported(
                1,
                "0x0000000000000000000000000000000000000000",
            );

            expect(result).toBeNull();
        });

        it("should return null for unsupported chain", async () => {
            vi.mocked(axios.get).mockResolvedValue({
                status: 200,
                data: mockApiResponse,
            });

            const result = await service.isAssetSupported(
                999,
                "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
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

    describe("error handling", () => {
        it("should throw AssetDiscoveryFailure on general HTTP error", async () => {
            const axiosError = new AxiosError("Request failed", "ERR_BAD_REQUEST");
            axiosError.response = {
                status: 500,
                data: { message: "Internal server error" },
                statusText: "Internal Server Error",
                headers: {},
                config: { headers: {} } as AxiosError["response"] extends { config: infer C }
                    ? C
                    : never,
            };
            vi.mocked(axios.get).mockRejectedValueOnce(axiosError);

            try {
                await service.getSupportedAssets();
                expect.fail("Should have thrown");
            } catch (error) {
                expect(error).toBeInstanceOf(AssetDiscoveryFailure);
                expect((error as AssetDiscoveryFailure).details).toMatch(/Internal server error/);
                expect((error as AssetDiscoveryFailure).details).toMatch(/api.custom.test/);
            }
        });

        it("should throw AssetDiscoveryFailure when parseResponse throws", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: "invalid data",
            });

            mockParseResponse.mockImplementationOnce(() => {
                throw new ZodError([
                    {
                        code: "invalid_type",
                        expected: "array",
                        received: "string",
                        path: [],
                        message: "Expected array, received string",
                    },
                ]);
            });

            try {
                await service.getSupportedAssets();
                expect.fail("Should have thrown");
            } catch (error) {
                expect(error).toBeInstanceOf(AssetDiscoveryFailure);
                expect((error as AssetDiscoveryFailure).message).toBe(
                    "Failed to fetch assets from custom API",
                );
                // Error details should include the Zod error message
                expect((error as AssetDiscoveryFailure).details).toMatch(/Expected array/);
            }
        });

        it("should throw AssetDiscoveryFailure on timeout with specific message", async () => {
            const axiosError = new AxiosError("timeout of 30000ms exceeded");
            axiosError.code = "ECONNABORTED";
            vi.mocked(axios.get).mockRejectedValueOnce(axiosError);

            try {
                await service.getSupportedAssets();
                expect.fail("Should have thrown");
            } catch (error) {
                expect(error).toBeInstanceOf(AssetDiscoveryFailure);
                expect((error as AssetDiscoveryFailure).message).toBe(
                    "Request to custom API timed out",
                );
                expect((error as AssetDiscoveryFailure).details).toMatch(/Timeout after/);
            }
        });

        it("should throw AssetDiscoveryFailure on rate limit (429)", async () => {
            const axiosError = new AxiosError("Too Many Requests", "ERR_BAD_REQUEST");
            axiosError.response = {
                status: 429,
                data: { message: "Rate limit exceeded" },
                statusText: "Too Many Requests",
                headers: {},
                config: { headers: {} } as AxiosError["response"] extends { config: infer C }
                    ? C
                    : never,
            };
            vi.mocked(axios.get).mockRejectedValueOnce(axiosError);

            try {
                await service.getSupportedAssets();
                expect.fail("Should have thrown");
            } catch (error) {
                expect(error).toBeInstanceOf(AssetDiscoveryFailure);
                expect((error as AssetDiscoveryFailure).message).toBe(
                    "custom API rate limit exceeded",
                );
            }
        });

        it("should throw AssetDiscoveryFailure on non-200 status code", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 404,
                data: null,
            });

            try {
                await service.getSupportedAssets();
                expect.fail("Should have thrown");
            } catch (error) {
                expect(error).toBeInstanceOf(AssetDiscoveryFailure);
                expect((error as AssetDiscoveryFailure).details).toMatch(/404/);
            }
        });
    });

    describe("cache management", () => {
        it("should respect custom cache TTL", async () => {
            const shortCacheTtl = 100; // 100ms
            const serviceWithShortCache = new CustomApiAssetDiscoveryService({
                assetsEndpoint,
                parseResponse: mockParseResponse,
                providerId,
                cacheTtl: shortCacheTtl,
            });

            vi.mocked(axios.get).mockResolvedValue({
                status: 200,
                data: mockApiResponse,
            });

            // First call
            await serviceWithShortCache.getSupportedAssets();
            expect(axios.get).toHaveBeenCalledTimes(1);

            // Wait for cache to expire
            await new Promise((resolve) => setTimeout(resolve, shortCacheTtl + 10));

            // Second call - cache should be expired
            await serviceWithShortCache.getSupportedAssets();
            expect(axios.get).toHaveBeenCalledTimes(2);
        });

        it("clearCache() method should clear the cache", async () => {
            vi.mocked(axios.get).mockResolvedValue({
                status: 200,
                data: mockApiResponse,
            });

            // First call
            await service.getSupportedAssets();
            expect(axios.get).toHaveBeenCalledTimes(1);

            // Clear cache
            service.clearCache();

            // Second call - should fetch again
            await service.getSupportedAssets();
            expect(axios.get).toHaveBeenCalledTimes(2);
        });
    });

    describe("custom timeout", () => {
        it("should use provided timeout option", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: mockApiResponse,
            });

            await service.getSupportedAssets({ timeout: 5000 });

            expect(axios.get).toHaveBeenCalledWith(
                assetsEndpoint,
                expect.objectContaining({
                    timeout: 5000,
                }),
            );
        });

        it("should use configured timeout when not provided in options", async () => {
            const serviceWithTimeout = new CustomApiAssetDiscoveryService({
                assetsEndpoint,
                parseResponse: mockParseResponse,
                providerId,
                timeout: 15000,
            });

            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: mockApiResponse,
            });

            await serviceWithTimeout.getSupportedAssets();

            expect(axios.get).toHaveBeenCalledWith(
                assetsEndpoint,
                expect.objectContaining({
                    timeout: 15000,
                }),
            );
        });
    });

    describe("in-flight request deduplication", () => {
        it("should dedupe concurrent calls to a single API request", async () => {
            let resolvePromise: (value: unknown) => void;
            const delayedPromise = new Promise((resolve) => {
                resolvePromise = resolve;
            });

            vi.mocked(axios.get).mockImplementationOnce(() =>
                delayedPromise.then(() => ({
                    status: 200,
                    data: mockApiResponse,
                })),
            );

            // Start two concurrent calls before the first resolves
            const promise1 = service.getSupportedAssets();
            const promise2 = service.getSupportedAssets();

            // Resolve the delayed promise
            resolvePromise!(undefined);

            // Both should resolve successfully
            const [result1, result2] = await Promise.all([promise1, promise2]);

            // Should only make one API call
            expect(axios.get).toHaveBeenCalledTimes(1);

            // Both results should be equivalent
            expect(Object.keys(result1.tokensByChain)).toHaveLength(2);
            expect(Object.keys(result2.tokensByChain)).toHaveLength(2);
        });

        it("should not dedupe concurrent forceRefresh calls", async () => {
            vi.mocked(axios.get).mockResolvedValue({
                status: 200,
                data: mockApiResponse,
            });

            // Start two concurrent forceRefresh calls
            const promise1 = service.getSupportedAssets({ forceRefresh: true });
            const promise2 = service.getSupportedAssets({ forceRefresh: true });

            // Both should resolve successfully
            const [result1, result2] = await Promise.all([promise1, promise2]);

            // forceRefresh bypasses in-flight dedup, so each call triggers a separate fetch
            expect(axios.get).toHaveBeenCalledTimes(2);

            // Both results should be equivalent
            expect(Object.keys(result1.tokensByChain)).toHaveLength(2);
            expect(Object.keys(result2.tokensByChain)).toHaveLength(2);
        });

        it("should clear in-flight state on failure and allow retry", async () => {
            const axiosError = new AxiosError("Network error", "ERR_NETWORK");

            // First call fails
            vi.mocked(axios.get).mockRejectedValueOnce(axiosError);

            await expect(service.getSupportedAssets()).rejects.toThrow(AssetDiscoveryFailure);

            // Second call should attempt a new request (not stuck on rejected promise)
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: mockApiResponse,
            });

            const result = await service.getSupportedAssets();

            // Should have made two API calls total
            expect(axios.get).toHaveBeenCalledTimes(2);
            expect(Object.keys(result.tokensByChain)).toHaveLength(2);
        });

        it("should apply chainIds filter to deduped result", async () => {
            let resolvePromise: (value: unknown) => void;
            const delayedPromise = new Promise((resolve) => {
                resolvePromise = resolve;
            });

            vi.mocked(axios.get).mockImplementationOnce(() =>
                delayedPromise.then(() => ({
                    status: 200,
                    data: mockApiResponse,
                })),
            );

            // Start two concurrent calls with different chainIds filters
            const promise1 = service.getSupportedAssets({ chainIds: [1] });
            const promise2 = service.getSupportedAssets({ chainIds: [137] });

            // Resolve the delayed promise
            resolvePromise!(undefined);

            const [result1, result2] = await Promise.all([promise1, promise2]);

            // Should only make one API call
            expect(axios.get).toHaveBeenCalledTimes(1);

            // Each result should have its own filter applied
            expect(Object.keys(result1.tokensByChain)).toHaveLength(1);
            expect(Object.keys(result1.tokensByChain)).toContain(toChainIdentifier(1));

            expect(Object.keys(result2.tokensByChain)).toHaveLength(1);
            expect(Object.keys(result2.tokensByChain)).toContain(toChainIdentifier(137));
        });
    });
});
