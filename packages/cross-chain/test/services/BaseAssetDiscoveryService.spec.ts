import { toChainIdentifier } from "@wonderland/interop-addresses";
import { AxiosError } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    AssetDiscoveryFailure,
    AssetDiscoveryResult,
    BaseAssetDiscoveryService,
    BaseAssetDiscoveryServiceConfig,
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
                timeout: 10_000,
            },
            fetchMock,
        );
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("default config values", () => {
        it("should use default timeout when not provided", () => {
            const defaultService = new TestAssetDiscoveryService({ providerId }, fetchMock);
            expect(BaseAssetDiscoveryService.DEFAULT_TIMEOUT).toBe(30_000);
            expect(defaultService).toBeDefined();
        });
    });

    describe("permanent caching", () => {
        it("should fetch on first call (cache miss)", async () => {
            await service.getSupportedAssets();

            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(fetchMock).toHaveBeenCalledWith(10_000);
        });

        it("should return cached result on subsequent calls (cache hit)", async () => {
            await service.getSupportedAssets();
            await service.getSupportedAssets();
            await service.getSupportedAssets();

            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        it("should never re-fetch once cached", async () => {
            vi.useFakeTimers();

            await service.getSupportedAssets();
            expect(fetchMock).toHaveBeenCalledTimes(1);

            // Advance time by a very large amount — cache should still hold
            vi.advanceTimersByTime(999_999_999);

            await service.getSupportedAssets();
            expect(fetchMock).toHaveBeenCalledTimes(1);

            vi.useRealTimers();
        });
    });

    describe("prefetch", () => {
        it("should start fetching immediately without awaiting", () => {
            let resolvePromise: (value: AssetDiscoveryResult) => void;
            const delayedPromise = new Promise<AssetDiscoveryResult>((resolve) => {
                resolvePromise = resolve;
            });
            fetchMock.mockReturnValueOnce(delayedPromise);

            service.prefetch();

            expect(fetchMock).toHaveBeenCalledTimes(1);

            // Resolve to avoid dangling promise
            resolvePromise!(mockResult);
        });

        it("should be a no-op when cache is already populated", async () => {
            await service.getSupportedAssets();
            expect(fetchMock).toHaveBeenCalledTimes(1);

            service.prefetch();
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        it("should be a no-op when a fetch is already in flight", () => {
            let resolvePromise: (value: AssetDiscoveryResult) => void;
            const delayedPromise = new Promise<AssetDiscoveryResult>((resolve) => {
                resolvePromise = resolve;
            });
            fetchMock.mockReturnValueOnce(delayedPromise);

            service.prefetch();
            service.prefetch();
            service.prefetch();

            expect(fetchMock).toHaveBeenCalledTimes(1);

            resolvePromise!(mockResult);
        });

        it("should populate cache so subsequent getSupportedAssets is instant", async () => {
            let resolvePromise: (value: AssetDiscoveryResult) => void;
            const delayedPromise = new Promise<AssetDiscoveryResult>((resolve) => {
                resolvePromise = resolve;
            });
            fetchMock.mockReturnValueOnce(delayedPromise);

            service.prefetch();
            resolvePromise!(mockResult);

            // Give the promise microtask a chance to settle
            await new Promise((r) => setTimeout(r, 0));

            const result = await service.getSupportedAssets();
            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(Object.keys(result.tokensByChain)).toHaveLength(2);
        });

        it("should not prevent retry after prefetch failure", async () => {
            fetchMock.mockRejectedValueOnce(new Error("Network error"));

            service.prefetch();

            // Wait for the rejection to settle
            await new Promise((r) => setTimeout(r, 0));

            fetchMock.mockResolvedValueOnce(mockResult);

            const result = await service.getSupportedAssets();
            expect(fetchMock).toHaveBeenCalledTimes(2);
            expect(Object.keys(result.tokensByChain)).toHaveLength(2);
        });
    });

    describe("chainIds filtering", () => {
        it("should filter by chainIds", async () => {
            const result = await service.getSupportedAssets({ chainIds: [1] });

            expect(Object.keys(result.tokensByChain)).toHaveLength(1);
            expect(Object.keys(result.tokensByChain)).toContain(toChainIdentifier(1));
        });

        it("should return all chains when chainIds is not provided", async () => {
            const result = await service.getSupportedAssets();

            expect(Object.keys(result.tokensByChain)).toHaveLength(2);
            expect(Object.keys(result.tokensByChain)).toContain(toChainIdentifier(1));
            expect(Object.keys(result.tokensByChain)).toContain(toChainIdentifier(137));
        });

        it("should return empty when chainIds matches nothing", async () => {
            const result = await service.getSupportedAssets({ chainIds: [999] });

            expect(Object.keys(result.tokensByChain)).toHaveLength(0);
        });

        it("should apply filter to cached result", async () => {
            // First call populates cache with all chains
            const full = await service.getSupportedAssets();
            expect(Object.keys(full.tokensByChain)).toHaveLength(2);

            // Second call with filter should return filtered cached result
            const filtered = await service.getSupportedAssets({ chainIds: [137] });
            expect(Object.keys(filtered.tokensByChain)).toHaveLength(1);
            expect(Object.keys(filtered.tokensByChain)).toContain(toChainIdentifier(137));

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
            expect(Object.keys(result1.tokensByChain)).toHaveLength(2);
            expect(Object.keys(result2.tokensByChain)).toHaveLength(2);
        });

        it("should clear in-flight state on failure and allow retry", async () => {
            fetchMock.mockRejectedValueOnce(new Error("Network error"));

            await expect(service.getSupportedAssets()).rejects.toThrow();

            // Second call should attempt a new fetch
            fetchMock.mockResolvedValueOnce(mockResult);

            const result = await service.getSupportedAssets();

            expect(fetchMock).toHaveBeenCalledTimes(2);
            expect(Object.keys(result.tokensByChain)).toHaveLength(2);
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

            expect(Object.keys(result1.tokensByChain)).toHaveLength(1);
            expect(Object.keys(result1.tokensByChain)).toContain(toChainIdentifier(1));

            expect(Object.keys(result2.tokensByChain)).toHaveLength(1);
            expect(Object.keys(result2.tokensByChain)).toContain(toChainIdentifier(137));
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
