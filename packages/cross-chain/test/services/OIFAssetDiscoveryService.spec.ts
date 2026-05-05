import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "../../src/core/errors/HttpError.exception.js";
import { HttpNetworkError } from "../../src/core/errors/HttpNetworkError.exception.js";
import { HttpTimeout } from "../../src/core/errors/HttpTimeout.exception.js";
import { httpRequest } from "../../src/core/utils/httpClient.js";
import { AssetDiscoveryFailure, OIFAssetDiscoveryService } from "../../src/internal.js";

vi.mock("../../src/core/utils/httpClient.js", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../src/core/utils/httpClient.js")>();
    return {
        ...actual,
        httpRequest: vi.fn(),
    };
});

describe("OIFAssetDiscoveryService", () => {
    const baseUrl = "https://api.solver.test";
    const providerId = "test-solver";

    let service: OIFAssetDiscoveryService;

    const mockApiResponse = {
        networks: {
            "1": {
                chain_id: 1,
                assets: [
                    {
                        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                        symbol: "USDC",
                        decimals: 6,
                    },
                    {
                        address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                        symbol: "WETH",
                        decimals: 18,
                    },
                ],
            },
            "137": {
                chain_id: 137,
                assets: [
                    {
                        address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
                        symbol: "USDC",
                        decimals: 6,
                    },
                ],
            },
        },
    };

    function mockOk(data: unknown): { status: number; data: unknown; headers: Headers } {
        return { status: 200, data, headers: new Headers() };
    }

    beforeEach(() => {
        vi.clearAllMocks();
        service = new OIFAssetDiscoveryService({
            baseUrl,
            providerId,
        });
    });

    describe("getSupportedAssets", () => {
        it("should fetch, transform, and return DiscoveredAssets", async () => {
            vi.mocked(httpRequest).mockResolvedValueOnce(mockOk(mockApiResponse));

            const result = await service.getSupportedAssets();

            expect(httpRequest).toHaveBeenCalledWith(`${baseUrl}/api/tokens`, expect.anything());

            // Returns DiscoveredAssets format
            expect(Object.keys(result.tokensByChain)).toHaveLength(2);
            expect(Object.keys(result.tokensByChain)).toContain(String(1));
            expect(Object.keys(result.tokensByChain)).toContain(String(137));

            // Verify tokensByChain has the expected tokens
            const ethTokens = result.tokensByChain[1];
            expect(ethTokens).toHaveLength(2);

            // Verify tokenMetadata is populated (nested by chain)
            expect(Object.keys(result.tokenMetadata)).toHaveLength(2); // chain 1 and chain 137
            expect(Object.keys(result.tokenMetadata[1]!)).toHaveLength(2);
            expect(Object.keys(result.tokenMetadata[137]!)).toHaveLength(1);
        });

        it("should cache results permanently after first fetch", async () => {
            vi.mocked(httpRequest).mockResolvedValue(mockOk(mockApiResponse));

            // First call - fetches from API
            await service.getSupportedAssets();
            expect(httpRequest).toHaveBeenCalledTimes(1);

            // Second call - should use cache
            await service.getSupportedAssets();
            expect(httpRequest).toHaveBeenCalledTimes(1);

            // Third call - still cached
            await service.getSupportedAssets();
            expect(httpRequest).toHaveBeenCalledTimes(1);
        });

        it("surfaces name and logoURI when the solver returns them", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: {
                    networks: {
                        "1": {
                            chain_id: 1,
                            assets: [
                                {
                                    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                                    symbol: "USDC",
                                    decimals: 6,
                                    name: "USD Coin",
                                    logoURI: "https://logo/usdc.png",
                                },
                            ],
                        },
                    },
                },
            });

            const result = await service.getSupportedAssets();
            const usdc = result.tokenMetadata[1]?.["0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"];

            expect(usdc?.name).toBe("USD Coin");
            expect(usdc?.logoURI).toBe("https://logo/usdc.png");
        });

        it("treats null name/logoURI as undefined", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: {
                    networks: {
                        "1": {
                            chain_id: 1,
                            assets: [
                                {
                                    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                                    symbol: "USDC",
                                    decimals: 6,
                                    name: null,
                                    logoURI: null,
                                },
                            ],
                        },
                    },
                },
            });

            const result = await service.getSupportedAssets();
            const usdc = result.tokenMetadata[1]?.["0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"];

            expect(usdc?.name).toBeUndefined();
            expect(usdc?.logoURI).toBeUndefined();
        });

        it("should filter by chainIds when provided", async () => {
            vi.mocked(httpRequest).mockResolvedValueOnce(mockOk(mockApiResponse));

            const result = await service.getSupportedAssets({ chainIds: [1] });

            expect(Object.keys(result.tokensByChain)).toHaveLength(1);
            expect(Object.keys(result.tokensByChain)).toContain(String(1));
        });
    });

    describe("getAssetsForChain", () => {
        it("should return assets for supported chain, null for unsupported", async () => {
            vi.mocked(httpRequest).mockResolvedValue(mockOk(mockApiResponse));

            const supported = await service.getAssetsForChain(1);
            expect(supported?.chainId).toBe(1);
            expect(supported?.assets).toHaveLength(2);

            const unsupported = await service.getAssetsForChain(999);
            expect(unsupported).toBeNull();
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

            // Non-existent asset
            const notFound = await service.isAssetSupported(
                1,
                "0x0000000000000000000000000000000000000000",
            );
            expect(notFound).toBeNull();
        });
    });

    describe("getSupportedChainIds", () => {
        it("should return list of supported chain IDs", async () => {
            vi.mocked(httpRequest).mockResolvedValueOnce(mockOk(mockApiResponse));

            const result = await service.getSupportedChainIds();
            expect(result).toEqual([1, 137]);
        });
    });

    describe("malformed API responses (malicious solver protection)", () => {
        it("should reject responses missing required fields", async () => {
            // Missing networks
            vi.mocked(httpRequest).mockResolvedValueOnce(mockOk({}));
            await expect(service.getSupportedAssets()).rejects.toThrow(AssetDiscoveryFailure);

            // Missing chain_id
            service = new OIFAssetDiscoveryService({ baseUrl, providerId });
            vi.mocked(httpRequest).mockResolvedValueOnce(
                mockOk({ networks: { "1": { assets: [] } } }),
            );
            await expect(service.getSupportedAssets()).rejects.toThrow(AssetDiscoveryFailure);

            // Missing asset symbol
            service = new OIFAssetDiscoveryService({ baseUrl, providerId });
            vi.mocked(httpRequest).mockResolvedValueOnce(
                mockOk({
                    networks: {
                        "1": {
                            chain_id: 1,
                            assets: [
                                {
                                    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                                    decimals: 6,
                                },
                            ],
                        },
                    },
                }),
            );
            await expect(service.getSupportedAssets()).rejects.toThrow(AssetDiscoveryFailure);
        });

        it("should reject invalid values that could cause issues downstream", async () => {
            // Negative chain_id
            vi.mocked(httpRequest).mockResolvedValueOnce(
                mockOk({ networks: { "-1": { chain_id: -1, assets: [] } } }),
            );
            await expect(service.getSupportedAssets()).rejects.toThrow(AssetDiscoveryFailure);

            // Invalid decimals (overflow risk)
            service = new OIFAssetDiscoveryService({ baseUrl, providerId });
            vi.mocked(httpRequest).mockResolvedValueOnce(
                mockOk({
                    networks: {
                        "1": {
                            chain_id: 1,
                            assets: [
                                {
                                    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                                    symbol: "FAKE",
                                    decimals: 256,
                                },
                            ],
                        },
                    },
                }),
            );
            await expect(service.getSupportedAssets()).rejects.toThrow(AssetDiscoveryFailure);

            // Invalid address format (injection risk)
            service = new OIFAssetDiscoveryService({ baseUrl, providerId });
            vi.mocked(httpRequest).mockResolvedValueOnce(
                mockOk({
                    networks: {
                        "1": {
                            chain_id: 1,
                            assets: [
                                { address: "not-a-valid-address", symbol: "FAKE", decimals: 6 },
                            ],
                        },
                    },
                }),
            );
            await expect(service.getSupportedAssets()).rejects.toThrow(AssetDiscoveryFailure);
        });
    });

    describe("network and API errors", () => {
        it("should wrap network errors in AssetDiscoveryFailure with providerId", async () => {
            const httpError = new HttpTimeout(`${baseUrl}/api/tokens`, 30000);
            vi.mocked(httpRequest).mockRejectedValueOnce(httpError);

            try {
                await service.getSupportedAssets();
                expect.fail("Should have thrown");
            } catch (error) {
                expect(error).toBeInstanceOf(AssetDiscoveryFailure);
                expect((error as AssetDiscoveryFailure).message).toMatch(/test-solver/);
                expect((error as AssetDiscoveryFailure).details).toMatch(/api.solver.test/);
            }
        });

        it("should include API error message when server returns error response", async () => {
            const httpError = new HttpError(
                "Request failed with status 401",
                `${baseUrl}/api/tokens`,
                401,
                { message: "Invalid API key" },
            );
            vi.mocked(httpRequest).mockRejectedValueOnce(httpError);

            try {
                await service.getSupportedAssets();
                expect.fail("Should have thrown");
            } catch (error) {
                expect(error).toBeInstanceOf(AssetDiscoveryFailure);
                expect((error as AssetDiscoveryFailure).message).toMatch(/test-solver/);
                expect((error as AssetDiscoveryFailure).details).toMatch(/Invalid API key/);
            }
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
            const httpError = new HttpNetworkError("Network error", `${baseUrl}/api/tokens`);

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
