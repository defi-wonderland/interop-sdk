import { AxiosError } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    AssetDiscoveryFailure,
    AssetDiscoveryResult,
    BaseAssetDiscoveryService,
    BaseAssetDiscoveryServiceConfig,
    toCaip2ChainId,
} from "../../src/internal.js";

/**
 * Minimal concrete subclass for testing the base class behavior.
 * Allows tests to control what fetchAssets returns.
 */
class TestAssetDiscoveryService extends BaseAssetDiscoveryService {
    private fetchFn: (timeout: number) => Promise<AssetDiscoveryResult>;

    constructor(
        config: BaseAssetDiscoveryServiceConfig,
        fetchFn: (timeout: number) => Promise<AssetDiscoveryResult>,
    ) {
        super(config);
        this.fetchFn = fetchFn;
    }

    protected async fetchAssets(timeout: number): Promise<AssetDiscoveryResult> {
        return this.fetchFn(timeout);
    }

    // Expose wrapError for testing
    public testWrapError(
        error: unknown,
        context: string,
        url: string,
        timeout: number = 30000,
    ): AssetDiscoveryFailure {
        return this.wrapError(error, context, url, timeout);
    }
}

describe("BaseAssetDiscoveryService", () => {
    const providerId = "test-provider";

    const mockResult: AssetDiscoveryResult = {
        networks: [
            {
                chainId: 1,
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
            {
                chainId: 137,
                assets: [
                    {
                        address: "0x00010000018902791Bca1f2de4661ED88A30C99A7a9449Aa84174",
                        symbol: "USDC",
                        decimals: 6,
                    },
                ],
            },
        ],
        fetchedAt: Date.now(),
        providerId,
    };

    let service: TestAssetDiscoveryService;
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        fetchMock = vi.fn().mockResolvedValue(mockResult);
        service = new TestAssetDiscoveryService(
            {
                providerId,
                cacheTtl: 60_000,
                timeout: 10_000,
            },
            fetchMock,
        );
    });

    afterEach(() => {
        service.clearCache();
        vi.clearAllMocks();
    });

    describe("default config values", () => {
        it("should use default cacheTtl when not provided", () => {
            const defaultService = new TestAssetDiscoveryService({ providerId }, fetchMock);
            expect(BaseAssetDiscoveryService.DEFAULT_CACHE_TTL).toBe(Infinity);
            // We can't directly access private fields, but we can verify behavior
            expect(defaultService).toBeDefined();
        });

        it("should use default timeout when not provided", () => {
            const defaultService = new TestAssetDiscoveryService({ providerId }, fetchMock);
            expect(BaseAssetDiscoveryService.DEFAULT_TIMEOUT).toBe(30_000);
            expect(defaultService).toBeDefined();
        });
    });

    describe("caching behavior", () => {
        it("should fetch on first call (cache miss)", async () => {
            await service.getSupportedAssets();

            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(fetchMock).toHaveBeenCalledWith(10_000); // configured timeout
        });

        it("should return cached result on subsequent calls (cache hit)", async () => {
            await service.getSupportedAssets();
            await service.getSupportedAssets();
            await service.getSupportedAssets();

            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        it("should fetch again after cache expires", async () => {
            vi.useFakeTimers();

            await service.getSupportedAssets();
            expect(fetchMock).toHaveBeenCalledTimes(1);

            // Advance time past cache TTL
            vi.advanceTimersByTime(60_001);

            await service.getSupportedAssets();
            expect(fetchMock).toHaveBeenCalledTimes(2);

            vi.useRealTimers();
        });

        it("should bypass cache when forceRefresh is true", async () => {
            await service.getSupportedAssets();
            expect(fetchMock).toHaveBeenCalledTimes(1);

            await service.getSupportedAssets({ forceRefresh: true });
            expect(fetchMock).toHaveBeenCalledTimes(2);
        });

        it("should use custom timeout from options over config timeout", async () => {
            await service.getSupportedAssets({ timeout: 5_000 });

            expect(fetchMock).toHaveBeenCalledWith(5_000);
        });
    });

    describe("clearCache", () => {
        it("should clear cache and allow fresh fetch", async () => {
            await service.getSupportedAssets();
            expect(fetchMock).toHaveBeenCalledTimes(1);

            service.clearCache();

            await service.getSupportedAssets();
            expect(fetchMock).toHaveBeenCalledTimes(2);
        });
    });

    describe("chainIds filtering", () => {
        it("should filter by chainIds", async () => {
            const result = await service.getSupportedAssets({ chainIds: [1] });

            expect(result.chainIds).toHaveLength(1);
            expect(result.chainIds).toContain(toCaip2ChainId(1));
        });

        it("should return all chains when chainIds is not provided", async () => {
            const result = await service.getSupportedAssets();

            expect(result.chainIds).toHaveLength(2);
            expect(result.chainIds).toContain(toCaip2ChainId(1));
            expect(result.chainIds).toContain(toCaip2ChainId(137));
        });

        it("should return empty when chainIds matches nothing", async () => {
            const result = await service.getSupportedAssets({ chainIds: [999] });

            expect(result.chainIds).toHaveLength(0);
            expect(Object.keys(result.tokensByChain)).toHaveLength(0);
        });

        it("should apply filter to cached result", async () => {
            // First call populates cache with all chains
            const full = await service.getSupportedAssets();
            expect(full.chainIds).toHaveLength(2);

            // Second call with filter should return filtered cached result
            const filtered = await service.getSupportedAssets({ chainIds: [137] });
            expect(filtered.chainIds).toHaveLength(1);
            expect(filtered.chainIds).toContain(toCaip2ChainId(137));

            // Only one fetch should have occurred
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });
    });

    describe("in-flight request deduplication", () => {
        it("should dedupe concurrent calls to a single fetch", async () => {
            let resolvePromise: (value: AssetDiscoveryResult) => void;
            const delayedPromise = new Promise<AssetDiscoveryResult>((resolve) => {
                resolvePromise = resolve;
            });

            fetchMock.mockReturnValueOnce(delayedPromise);

            // Start two concurrent calls before the first resolves
            const promise1 = service.getSupportedAssets();
            const promise2 = service.getSupportedAssets();

            // Resolve the delayed promise
            resolvePromise!(mockResult);

            const [result1, result2] = await Promise.all([promise1, promise2]);

            // Should only call fetchAssets once
            expect(fetchMock).toHaveBeenCalledTimes(1);

            // Both results should be equivalent
            expect(result1.chainIds).toHaveLength(2);
            expect(result2.chainIds).toHaveLength(2);
        });

        it("should not dedupe concurrent forceRefresh calls", async () => {
            fetchMock.mockResolvedValue(mockResult);

            const promise1 = service.getSupportedAssets({ forceRefresh: true });
            const promise2 = service.getSupportedAssets({ forceRefresh: true });

            const [result1, result2] = await Promise.all([promise1, promise2]);

            // forceRefresh bypasses in-flight dedup, so each call triggers a separate fetch
            expect(fetchMock).toHaveBeenCalledTimes(2);

            expect(result1.chainIds).toHaveLength(2);
            expect(result2.chainIds).toHaveLength(2);
        });

        it("should clear in-flight state on failure and allow retry", async () => {
            fetchMock.mockRejectedValueOnce(new Error("Network error"));

            await expect(service.getSupportedAssets()).rejects.toThrow();

            // Second call should attempt a new fetch
            fetchMock.mockResolvedValueOnce(mockResult);

            const result = await service.getSupportedAssets();

            expect(fetchMock).toHaveBeenCalledTimes(2);
            expect(result.chainIds).toHaveLength(2);
        });

        it("should apply different chainIds filters to same deduped result", async () => {
            let resolvePromise: (value: AssetDiscoveryResult) => void;
            const delayedPromise = new Promise<AssetDiscoveryResult>((resolve) => {
                resolvePromise = resolve;
            });

            fetchMock.mockReturnValueOnce(delayedPromise);

            const promise1 = service.getSupportedAssets({ chainIds: [1] });
            const promise2 = service.getSupportedAssets({ chainIds: [137] });

            resolvePromise!(mockResult);

            const [result1, result2] = await Promise.all([promise1, promise2]);

            expect(fetchMock).toHaveBeenCalledTimes(1);

            expect(result1.chainIds).toHaveLength(1);
            expect(result1.chainIds).toContain(toCaip2ChainId(1));

            expect(result2.chainIds).toHaveLength(1);
            expect(result2.chainIds).toContain(toCaip2ChainId(137));
        });
    });

    describe("convenience methods", () => {
        describe("getAssetsForChain", () => {
            it("should return assets for a supported chain", async () => {
                const result = await service.getAssetsForChain(1);

                expect(result?.chainId).toBe(1);
                expect(result?.assets).toHaveLength(2);
            });

            it("should return null for an unsupported chain", async () => {
                const result = await service.getAssetsForChain(999);

                expect(result).toBeNull();
            });
        });

        describe("isAssetSupported", () => {
            it("should find asset with exact address match", async () => {
                const result = await service.isAssetSupported(
                    1,
                    "0x000100000101A0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                );

                expect(result?.symbol).toBe("USDC");
            });

            it("should find asset with case-insensitive address match", async () => {
                const result = await service.isAssetSupported(
                    1,
                    "0x000100000101a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                );

                expect(result?.symbol).toBe("USDC");
            });

            it("should return null for non-existent asset", async () => {
                const result = await service.isAssetSupported(
                    1,
                    "0x0001000001010000000000000000000000000000000000000000",
                );

                expect(result).toBeNull();
            });

            it("should return null for unsupported chain", async () => {
                const result = await service.isAssetSupported(
                    999,
                    "0x000100000101A0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                );

                expect(result).toBeNull();
            });
        });

        describe("getSupportedChainIds", () => {
            it("should return list of supported chain IDs", async () => {
                const result = await service.getSupportedChainIds();

                expect(result).toEqual([1, 137]);
            });

            it("should respect chainIds filter in options", async () => {
                const result = await service.getSupportedChainIds({ chainIds: [1] });

                expect(result).toEqual([1]);
            });
        });
    });

    describe("wrapError", () => {
        it("should return existing AssetDiscoveryFailure unchanged", () => {
            const original = new AssetDiscoveryFailure("Original error", "details");

            const wrapped = service.testWrapError(original, "context", "http://test.url");

            expect(wrapped).toBe(original);
        });

        it("should wrap timeout errors (ECONNABORTED) with correct timeout value", () => {
            const axiosError = new AxiosError("timeout", "ECONNABORTED");
            const customTimeout = 15000;

            const wrapped = service.testWrapError(
                axiosError,
                "test API",
                "http://test.url",
                customTimeout,
            );

            expect(wrapped).toBeInstanceOf(AssetDiscoveryFailure);
            expect(wrapped.message).toMatch(/timed out/);
            expect(wrapped.details).toMatch(/15000ms/);
            expect(wrapped.details).toMatch(/http:\/\/test.url/);
        });

        it("should wrap rate limit errors (429)", () => {
            const axiosError = new AxiosError("rate limited", "ERR_BAD_REQUEST");
            axiosError.response = {
                status: 429,
                data: {},
                statusText: "Too Many Requests",
                headers: {},
                config: { headers: {} } as AxiosError["response"] extends { config: infer C }
                    ? C
                    : never,
            };

            const wrapped = service.testWrapError(axiosError, "test API", "http://test.url");

            expect(wrapped).toBeInstanceOf(AssetDiscoveryFailure);
            expect(wrapped.message).toMatch(/rate limit/);
        });

        it("should extract error message from response data", () => {
            const axiosError = new AxiosError("Request failed", "ERR_BAD_REQUEST");
            axiosError.response = {
                status: 401,
                data: { message: "Invalid API key" },
                statusText: "Unauthorized",
                headers: {},
                config: { headers: {} } as AxiosError["response"] extends { config: infer C }
                    ? C
                    : never,
            };

            const wrapped = service.testWrapError(axiosError, "test API", "http://test.url");

            expect(wrapped).toBeInstanceOf(AssetDiscoveryFailure);
            expect(wrapped.details).toMatch(/Invalid API key/);
        });

        it("should wrap generic AxiosError without response", () => {
            const axiosError = new AxiosError("Network error", "ERR_NETWORK");

            const wrapped = service.testWrapError(axiosError, "test API", "http://test.url");

            expect(wrapped).toBeInstanceOf(AssetDiscoveryFailure);
            expect(wrapped.details).toMatch(/Network error/);
        });

        it("should wrap non-Axios errors", () => {
            const genericError = new Error("Something went wrong");

            const wrapped = service.testWrapError(genericError, "test API", "http://test.url");

            expect(wrapped).toBeInstanceOf(AssetDiscoveryFailure);
            expect(wrapped.details).toMatch(/Something went wrong/);
            expect(wrapped.details).toMatch(/http:\/\/test.url/);
        });

        it("should handle non-Error objects", () => {
            const wrapped = service.testWrapError("string error", "test API", "http://test.url");

            expect(wrapped).toBeInstanceOf(AssetDiscoveryFailure);
            expect(wrapped.details).toMatch(/string error/);
        });
    });
});
