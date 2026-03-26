import axios, { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AssetDiscoveryFailure, OIFAssetDiscoveryService } from "../../src/internal.js";

vi.mock("axios");

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

    beforeEach(() => {
        vi.clearAllMocks();
        service = new OIFAssetDiscoveryService({
            baseUrl,
            providerId,
        });
    });

    describe("getSupportedAssets", () => {
        it("should fetch, transform, and return DiscoveredAssets", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: mockApiResponse,
            });

            const result = await service.getSupportedAssets();

            expect(axios.get).toHaveBeenCalledWith(`${baseUrl}/api/tokens`, expect.anything());

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

            // Third call - still cached
            await service.getSupportedAssets();
            expect(axios.get).toHaveBeenCalledTimes(1);
        });

        it("should filter by chainIds when provided", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: mockApiResponse,
            });

            const result = await service.getSupportedAssets({ chainIds: [1] });

            expect(Object.keys(result.tokensByChain)).toHaveLength(1);
            expect(Object.keys(result.tokensByChain)).toContain(String(1));
        });
    });

    describe("getAssetsForChain", () => {
        it("should return assets for supported chain, null for unsupported", async () => {
            vi.mocked(axios.get).mockResolvedValue({
                status: 200,
                data: mockApiResponse,
            });

            const supported = await service.getAssetsForChain(1);
            expect(supported?.chainId).toBe(1);
            expect(supported?.assets).toHaveLength(2);

            const unsupported = await service.getAssetsForChain(999);
            expect(unsupported).toBeNull();
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
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: mockApiResponse,
            });

            const result = await service.getSupportedChainIds();
            expect(result).toEqual([1, 137]);
        });
    });

    describe("malformed API responses (malicious solver protection)", () => {
        it("should reject responses missing required fields", async () => {
            // Missing networks
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: {},
            });
            await expect(service.getSupportedAssets()).rejects.toThrow(AssetDiscoveryFailure);

            // Missing chain_id
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: { networks: { "1": { assets: [] } } },
            });
            await expect(service.getSupportedAssets()).rejects.toThrow(AssetDiscoveryFailure);

            // Missing asset symbol
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: {
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
                },
            });
            await expect(service.getSupportedAssets()).rejects.toThrow(AssetDiscoveryFailure);
        });

        it("should reject invalid values that could cause issues downstream", async () => {
            // Negative chain_id
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: { networks: { "-1": { chain_id: -1, assets: [] } } },
            });
            await expect(service.getSupportedAssets()).rejects.toThrow(AssetDiscoveryFailure);

            // Invalid decimals (overflow risk)
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: {
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
                },
            });
            await expect(service.getSupportedAssets()).rejects.toThrow(AssetDiscoveryFailure);

            // Invalid address format (injection risk)
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: {
                    networks: {
                        "1": {
                            chain_id: 1,
                            assets: [
                                { address: "not-a-valid-address", symbol: "FAKE", decimals: 6 },
                            ],
                        },
                    },
                },
            });
            await expect(service.getSupportedAssets()).rejects.toThrow(AssetDiscoveryFailure);
        });
    });

    describe("network and API errors", () => {
        it("should wrap network errors in AssetDiscoveryFailure with providerId", async () => {
            const axiosError = new AxiosError("timeout of 30000ms exceeded");
            axiosError.code = "ECONNABORTED";
            axiosError.config = { url: `${baseUrl}/api/tokens` } as never;
            vi.mocked(axios.get).mockRejectedValueOnce(axiosError);

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
            vi.mocked(axios.get).mockRejectedValueOnce(axiosError);

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
            expect(Object.keys(result1.tokensByChain)).toContain(String(1));

            expect(Object.keys(result2.tokensByChain)).toHaveLength(1);
            expect(Object.keys(result2.tokensByChain)).toContain(String(137));
        });
    });
});
