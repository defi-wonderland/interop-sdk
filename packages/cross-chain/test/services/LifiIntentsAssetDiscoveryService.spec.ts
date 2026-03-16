import axios, { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AssetDiscoveryFailure } from "../../src/core/errors/AssetDiscoveryFailure.exception.js";
import { LifiIntentsAssetDiscoveryService } from "../../src/protocols/lifi-intents/services/LifiIntentsAssetDiscoveryService.js";

vi.mock("axios");

const ORDER_SERVER_URL = "https://order.li.fi";
const PROVIDER_ID = "lifi-intents-test";

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

describe("LifiIntentsAssetDiscoveryService", () => {
    let service: LifiIntentsAssetDiscoveryService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new LifiIntentsAssetDiscoveryService({
            orderServerUrl: ORDER_SERVER_URL,
            providerId: PROVIDER_ID,
        });
    });

    describe("getSupportedAssets", () => {
        it("fetches routes and returns DiscoveredAssets", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: mockRoutesResponse,
            });

            const result = await service.getSupportedAssets();

            expect(axios.get).toHaveBeenCalledWith(`${ORDER_SERVER_URL}/routes`, expect.anything());

            expect(Object.keys(result.tokensByChain).length).toBeGreaterThanOrEqual(2);
            expect(Object.keys(result.tokensByChain)).toContain(String(8453));
            expect(Object.keys(result.tokensByChain)).toContain(String(42161));
        });

        it("deduplicates assets on the same chain", async () => {
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

            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: dupeRoutes,
            });

            const result = await service.getSupportedAssets();

            const baseTokens = result.tokensByChain[8453];
            expect(baseTokens).toHaveLength(1);
        });

        it("handles null symbol by falling back to empty string", async () => {
            const addr = "0xaaaa000000000000000000000000000000000000";
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: {
                    routes: [
                        {
                            fromChain: { chainId: "1" },
                            toChain: { chainId: "8453" },
                            fromToken: {
                                symbol: null,
                                name: null,
                                address: addr,
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
                },
            });

            const result = await service.getSupportedAssets();
            const meta = result.tokenMetadata[1]![addr.toLowerCase()]!;
            expect(meta.symbol).toBe("");
        });

        it("caches results after first fetch", async () => {
            vi.mocked(axios.get).mockResolvedValue({
                status: 200,
                data: mockRoutesResponse,
            });

            await service.getSupportedAssets();
            await service.getSupportedAssets();

            expect(axios.get).toHaveBeenCalledTimes(1);
        });

        it("filters by chainIds when provided", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: mockRoutesResponse,
            });

            const result = await service.getSupportedAssets({ chainIds: [8453] });
            expect(Object.keys(result.tokensByChain)).toContain(String(8453));
            expect(Object.keys(result.tokensByChain)).not.toContain(String(1));
        });
    });

    describe("getAssetsForChain", () => {
        it("returns assets for a supported chain", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: mockRoutesResponse,
            });

            const result = await service.getAssetsForChain(8453);
            expect(result).not.toBeNull();
            expect(result!.chainId).toBe(8453);
            expect(result!.assets.length).toBeGreaterThanOrEqual(1);
        });

        it("returns null for unsupported chain", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: mockRoutesResponse,
            });

            const result = await service.getAssetsForChain(999);
            expect(result).toBeNull();
        });
    });

    describe("error handling", () => {
        it("throws AssetDiscoveryFailure on non-200 status", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 502,
                data: {},
            });

            await expect(service.getSupportedAssets()).rejects.toThrow(AssetDiscoveryFailure);
        });

        it("wraps network errors in AssetDiscoveryFailure", async () => {
            const axiosError = new AxiosError("timeout of 30000ms exceeded");
            axiosError.code = "ECONNABORTED";
            axiosError.config = { url: `${ORDER_SERVER_URL}/routes` } as never;
            vi.mocked(axios.get).mockRejectedValueOnce(axiosError);

            await expect(service.getSupportedAssets()).rejects.toThrow(AssetDiscoveryFailure);
        });

        it("throws AssetDiscoveryFailure on invalid response schema", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                status: 200,
                data: { invalid: "data" },
            });

            await expect(service.getSupportedAssets()).rejects.toThrow(AssetDiscoveryFailure);
        });
    });
});
