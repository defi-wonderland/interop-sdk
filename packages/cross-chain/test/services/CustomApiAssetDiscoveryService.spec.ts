import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

import { HttpError } from "../../src/core/errors/HttpError.exception.js";
import { HttpNetworkError } from "../../src/core/errors/HttpNetworkError.exception.js";
import { HttpTimeout } from "../../src/core/errors/HttpTimeout.exception.js";
import { httpRequest } from "../../src/core/utils/httpClient.js";
import {
    AssetDiscoveryFailure,
    CustomApiAssetDiscoveryService,
    NetworkAssets,
} from "../../src/internal.js";

vi.mock("../../src/core/utils/httpClient.js", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../src/core/utils/httpClient.js")>();
    return {
        ...actual,
        httpRequest: vi.fn(),
    };
});

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

    function mockOk(data: unknown): { status: number; data: unknown; headers: Headers } {
        return {
            status: 200,
            data,
            headers: new Headers(),
        };
    }

    beforeEach(() => {
        vi.clearAllMocks();
        mockParseResponse.mockClear();
        service = new CustomApiAssetDiscoveryService({
            assetsEndpoint,
            parseResponse: mockParseResponse,
            providerId,
        });
    });

    describe("getSupportedAssets", () => {
        it("should fetch and return DiscoveredAssets", async () => {
            vi.mocked(httpRequest).mockResolvedValueOnce(mockOk(mockApiResponse));

            const result = await service.getSupportedAssets();

            expect(httpRequest).toHaveBeenCalledWith(assetsEndpoint, expect.anything());

            // Returns DiscoveredAssets format
            expect(Object.keys(result.tokensByChain)).toHaveLength(2);
            expect(Object.keys(result.tokensByChain)).toContain(String(1));
            expect(Object.keys(result.tokensByChain)).toContain(String(137));

            // Verify tokensByChain has the expected tokens
            const ethTokens = result.tokensByChain[1];
            expect(ethTokens).toHaveLength(2);
        });

        it("should use cache on subsequent calls", async () => {
            vi.mocked(httpRequest).mockResolvedValue(mockOk(mockApiResponse));

            // First call - fetches from API
            await service.getSupportedAssets();
            expect(httpRequest).toHaveBeenCalledTimes(1);

            // Second call - should use cache
            await service.getSupportedAssets();
            expect(httpRequest).toHaveBeenCalledTimes(1);
        });

        it("should filter by chain IDs", async () => {
            vi.mocked(httpRequest).mockResolvedValueOnce(mockOk(mockApiResponse));

            const result = await service.getSupportedAssets({ chainIds: [1] });

            expect(Object.keys(result.tokensByChain)).toHaveLength(1);
            expect(Object.keys(result.tokensByChain)).toContain(String(1));
        });

        it("should handle empty response array", async () => {
            vi.mocked(httpRequest).mockResolvedValueOnce(mockOk([]));
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

            vi.mocked(httpRequest).mockResolvedValueOnce(mockOk(mockApiResponse));

            await serviceWithHeaders.getSupportedAssets();

            expect(httpRequest).toHaveBeenCalledWith(
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
            vi.mocked(httpRequest).mockResolvedValue(mockOk(mockApiResponse));

            const result = await service.getAssetsForChain(1);

            expect(result?.chainId).toBe(1);
            expect(result?.assets).toHaveLength(2);
        });

        it("should return null for unsupported chain", async () => {
            vi.mocked(httpRequest).mockResolvedValue(mockOk(mockApiResponse));

            const result = await service.getAssetsForChain(999);

            expect(result).toBeNull();
        });
    });

    describe("isAssetSupported", () => {
        it("should find asset with case-insensitive address comparison", async () => {
            vi.mocked(httpRequest).mockResolvedValue(mockOk(mockApiResponse));

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
            vi.mocked(httpRequest).mockResolvedValue(mockOk(mockApiResponse));

            const result = await service.isAssetSupported(
                1,
                "0x0000000000000000000000000000000000000000",
            );

            expect(result).toBeNull();
        });

        it("should return null for unsupported chain", async () => {
            vi.mocked(httpRequest).mockResolvedValue(mockOk(mockApiResponse));

            const result = await service.isAssetSupported(
                999,
                "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            );

            expect(result).toBeNull();
        });
    });

    describe("getSupportedChainIds", () => {
        it("should return list of supported chain IDs", async () => {
            vi.mocked(httpRequest).mockResolvedValueOnce(mockOk(mockApiResponse));

            const result = await service.getSupportedChainIds();

            expect(result).toEqual([1, 137]);
        });
    });

    describe("error handling", () => {
        it("should throw AssetDiscoveryFailure on general HTTP error with providerId", async () => {
            const httpError = new HttpError("Request failed with status 500", assetsEndpoint, 500, {
                message: "Internal server error",
            });
            vi.mocked(httpRequest).mockRejectedValueOnce(httpError);

            try {
                await service.getSupportedAssets();
                expect.fail("Should have thrown");
            } catch (error) {
                expect(error).toBeInstanceOf(AssetDiscoveryFailure);
                expect((error as AssetDiscoveryFailure).message).toMatch(/test-provider/);
                expect((error as AssetDiscoveryFailure).details).toMatch(/Internal server error/);
                expect((error as AssetDiscoveryFailure).details).toMatch(/api.custom.test/);
            }
        });

        it("should throw AssetDiscoveryFailure when parseResponse throws", async () => {
            vi.mocked(httpRequest).mockResolvedValueOnce(mockOk("invalid data"));

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
                expect((error as AssetDiscoveryFailure).message).toMatch(/test-provider/);
                expect((error as AssetDiscoveryFailure).details).toMatch(/Expected array/);
            }
        });

        it("should throw AssetDiscoveryFailure on timeout with providerId", async () => {
            const httpError = new HttpTimeout(assetsEndpoint, 30000);
            vi.mocked(httpRequest).mockRejectedValueOnce(httpError);

            try {
                await service.getSupportedAssets();
                expect.fail("Should have thrown");
            } catch (error) {
                expect(error).toBeInstanceOf(AssetDiscoveryFailure);
                expect((error as AssetDiscoveryFailure).message).toMatch(/test-provider/);
                expect((error as AssetDiscoveryFailure).message).toMatch(/timed out/);
                expect((error as AssetDiscoveryFailure).details).toMatch(/Timeout after/);
            }
        });

        it("should throw AssetDiscoveryFailure on rate limit (429) with providerId", async () => {
            const httpError = new HttpError("Request failed with status 429", assetsEndpoint, 429, {
                message: "Rate limit exceeded",
            });
            vi.mocked(httpRequest).mockRejectedValueOnce(httpError);

            try {
                await service.getSupportedAssets();
                expect.fail("Should have thrown");
            } catch (error) {
                expect(error).toBeInstanceOf(AssetDiscoveryFailure);
                expect((error as AssetDiscoveryFailure).message).toMatch(/test-provider/);
                expect((error as AssetDiscoveryFailure).message).toMatch(/rate limit/);
            }
        });
    });

    describe("configured timeout", () => {
        it("should use configured timeout for API requests", async () => {
            const serviceWithTimeout = new CustomApiAssetDiscoveryService({
                assetsEndpoint,
                parseResponse: mockParseResponse,
                providerId,
                timeout: 15000,
            });

            vi.mocked(httpRequest).mockResolvedValueOnce(mockOk(mockApiResponse));

            await serviceWithTimeout.getSupportedAssets();

            expect(httpRequest).toHaveBeenCalledWith(
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

            vi.mocked(httpRequest).mockImplementationOnce(
                () =>
                    delayedPromise.then(() => mockOk(mockApiResponse)) as ReturnType<
                        typeof httpRequest
                    >,
            );

            // Start two concurrent calls before the first resolves
            const promise1 = service.getSupportedAssets();
            const promise2 = service.getSupportedAssets();

            // Resolve the delayed promise
            resolvePromise!(undefined);

            // Both should resolve successfully
            const [result1, result2] = await Promise.all([promise1, promise2]);

            // Should only make one API call
            expect(httpRequest).toHaveBeenCalledTimes(1);

            // Both results should be equivalent
            expect(Object.keys(result1.tokensByChain)).toHaveLength(2);
            expect(Object.keys(result2.tokensByChain)).toHaveLength(2);
        });

        it("should clear in-flight state on failure and allow retry", async () => {
            const httpError = new HttpNetworkError("Network error", assetsEndpoint);

            // First call fails
            vi.mocked(httpRequest).mockRejectedValueOnce(httpError);

            await expect(service.getSupportedAssets()).rejects.toThrow(AssetDiscoveryFailure);

            // Second call should attempt a new request (not stuck on rejected promise)
            vi.mocked(httpRequest).mockResolvedValueOnce(mockOk(mockApiResponse));

            const result = await service.getSupportedAssets();

            // Should have made two API calls total
            expect(httpRequest).toHaveBeenCalledTimes(2);
            expect(Object.keys(result.tokensByChain)).toHaveLength(2);
        });

        it("should apply chainIds filter to deduped result", async () => {
            let resolvePromise: (value: unknown) => void;
            const delayedPromise = new Promise((resolve) => {
                resolvePromise = resolve;
            });

            vi.mocked(httpRequest).mockImplementationOnce(
                () =>
                    delayedPromise.then(() => mockOk(mockApiResponse)) as ReturnType<
                        typeof httpRequest
                    >,
            );

            // Start two concurrent calls with different chainIds filters
            const promise1 = service.getSupportedAssets({ chainIds: [1] });
            const promise2 = service.getSupportedAssets({ chainIds: [137] });

            // Resolve the delayed promise
            resolvePromise!(undefined);

            const [result1, result2] = await Promise.all([promise1, promise2]);

            // Should only make one API call
            expect(httpRequest).toHaveBeenCalledTimes(1);

            // Each result should have its own filter applied
            expect(Object.keys(result1.tokensByChain)).toHaveLength(1);
            expect(Object.keys(result1.tokensByChain)).toContain(String(1));

            expect(Object.keys(result2.tokensByChain)).toHaveLength(1);
            expect(Object.keys(result2.tokensByChain)).toContain(String(137));
        });
    });
});
