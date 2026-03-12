import axios, { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AssetDiscoveryFailure, RelayAssetDiscoveryService } from "../../src/external.js";

vi.mock("axios");

// ── Constants ────────────────────────────────────────────

const BASE_URL = "https://api.relay.test";
const CHAINS_ENDPOINT = `${BASE_URL}/chains`;
const PROVIDER_ID = "relay";
const CUSTOM_TIMEOUT = 15_000;

const ETHEREUM_CHAIN_ID = 1;
const OPTIMISM_CHAIN_ID = 10;
const ARBITRUM_CHAIN_ID = 42_161;
const SOLANA_CHAIN_ID = 792_703_809;
const UNSUPPORTED_CHAIN_ID = 999;

const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDC_ADDRESS_LOWERCASE = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const OP_USDC_ADDRESS = "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85";
const ARB_USDC_ADDRESS = "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const API_KEY_HEADER = "x-api-key";
const API_KEY_VALUE = "test-key";

// ── Mock Data ────────────────────────────────────────────

/** Minimal GET /chains response with two EVM chains and one SVM chain. */
const MOCK_CHAINS_RESPONSE = {
    chains: [
        {
            id: ETHEREUM_CHAIN_ID,
            vmType: "evm",
            solverCurrencies: [
                { address: USDC_ADDRESS, symbol: "USDC", name: "USD Coin", decimals: 6 },
                { address: WETH_ADDRESS, symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
            ],
        },
        {
            id: OPTIMISM_CHAIN_ID,
            vmType: "evm",
            solverCurrencies: [
                { address: OP_USDC_ADDRESS, symbol: "USDC", name: "USD Coin", decimals: 6 },
            ],
        },
        {
            id: SOLANA_CHAIN_ID,
            vmType: "svm",
            solverCurrencies: [
                {
                    address: "So11111111111111111111111111111111111111112",
                    symbol: "SOL",
                    name: "Wrapped SOL",
                    decimals: 9,
                },
            ],
        },
    ],
};

const ETHEREUM_CURRENCY_COUNT = 2;
const EVM_CHAIN_COUNT = 2;

describe("RelayAssetDiscoveryService", () => {
    let service: RelayAssetDiscoveryService;

    /** Configures mock for a successful GET /chains flow. */
    function mockSuccessfulFetch(): void {
        vi.mocked(axios.get).mockResolvedValueOnce({ data: MOCK_CHAINS_RESPONSE });
    }

    beforeEach(() => {
        vi.clearAllMocks();
        service = new RelayAssetDiscoveryService({ baseUrl: BASE_URL, providerId: PROVIDER_ID });
    });

    describe("getSupportedAssets", () => {
        it("fetches chains and returns DiscoveredAssets from solverCurrencies", async () => {
            mockSuccessfulFetch();

            const result = await service.getSupportedAssets();

            expect(axios.get).toHaveBeenCalledWith(CHAINS_ENDPOINT, expect.anything());
            expect(axios.post).not.toHaveBeenCalled();

            expect(Object.keys(result.tokensByChain)).toHaveLength(EVM_CHAIN_COUNT);
            expect(Object.keys(result.tokensByChain)).toContain(String(ETHEREUM_CHAIN_ID));
            expect(Object.keys(result.tokensByChain)).toContain(String(OPTIMISM_CHAIN_ID));

            expect(result.tokensByChain[ETHEREUM_CHAIN_ID]).toHaveLength(ETHEREUM_CURRENCY_COUNT);

            expect(Object.keys(result.tokenMetadata)).toHaveLength(EVM_CHAIN_COUNT);
        });

        it("caches results permanently after first fetch", async () => {
            mockSuccessfulFetch();

            await service.getSupportedAssets();
            expect(axios.get).toHaveBeenCalledTimes(1);

            await service.getSupportedAssets();
            expect(axios.get).toHaveBeenCalledTimes(1);
        });

        it("filters by chainIds when provided", async () => {
            mockSuccessfulFetch();

            const result = await service.getSupportedAssets({
                chainIds: [ETHEREUM_CHAIN_ID],
            });

            expect(Object.keys(result.tokensByChain)).toHaveLength(1);
            expect(Object.keys(result.tokensByChain)).toContain(String(ETHEREUM_CHAIN_ID));
        });

        it("returns empty result when /chains returns no EVM chains", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                data: {
                    chains: [
                        {
                            id: SOLANA_CHAIN_ID,
                            vmType: "svm",
                            solverCurrencies: [
                                {
                                    address: "So11111111111111111111111111111111111111112",
                                    symbol: "SOL",
                                    name: "Wrapped SOL",
                                    decimals: 9,
                                },
                            ],
                        },
                    ],
                },
            });

            const result = await service.getSupportedAssets();

            expect(Object.keys(result.tokensByChain)).toHaveLength(0);
        });

        it("includes custom headers in requests", async () => {
            const headers = { [API_KEY_HEADER]: API_KEY_VALUE };
            const serviceWithHeaders = new RelayAssetDiscoveryService({
                baseUrl: BASE_URL,
                providerId: PROVIDER_ID,
                headers,
            });

            mockSuccessfulFetch();

            await serviceWithHeaders.getSupportedAssets();

            expect(axios.get).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ headers }),
            );
        });
    });

    describe("EVM filtering", () => {
        it("excludes non-EVM chains from /chains response", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                data: {
                    chains: [
                        {
                            id: ETHEREUM_CHAIN_ID,
                            vmType: "evm",
                            solverCurrencies: [
                                {
                                    address: USDC_ADDRESS,
                                    symbol: "USDC",
                                    name: "USD Coin",
                                    decimals: 6,
                                },
                            ],
                        },
                        {
                            id: SOLANA_CHAIN_ID,
                            vmType: "svm",
                            solverCurrencies: [
                                {
                                    address: "So11111111111111111111111111111111111111112",
                                    symbol: "SOL",
                                    name: "Wrapped SOL",
                                    decimals: 9,
                                },
                            ],
                        },
                        {
                            id: UNSUPPORTED_CHAIN_ID,
                            vmType: "tvm",
                            solverCurrencies: [],
                        },
                    ],
                },
            });

            const result = await service.getSupportedAssets();

            expect(Object.keys(result.tokensByChain)).toHaveLength(1);
        });

        it("treats chains without vmType as EVM (legacy entries)", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                data: {
                    chains: [
                        {
                            id: ARBITRUM_CHAIN_ID,
                            solverCurrencies: [
                                {
                                    address: ARB_USDC_ADDRESS,
                                    symbol: "USDC.e",
                                    name: "Bridged USDC",
                                    decimals: 6,
                                },
                            ],
                        },
                    ],
                },
            });

            const chainIds = await service.getSupportedChainIds();
            expect(chainIds).toContain(ARBITRUM_CHAIN_ID);
        });
    });

    describe("address deduplication", () => {
        it("deduplicates addresses within the same chain (case-insensitive)", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                data: {
                    chains: [
                        {
                            id: ETHEREUM_CHAIN_ID,
                            vmType: "evm",
                            solverCurrencies: [
                                {
                                    address: USDC_ADDRESS,
                                    symbol: "USDC",
                                    name: "USD Coin",
                                    decimals: 6,
                                },
                                {
                                    address: USDC_ADDRESS_LOWERCASE,
                                    symbol: "USDC",
                                    name: "USD Coin",
                                    decimals: 6,
                                },
                            ],
                        },
                    ],
                },
            });

            const assets = await service.getAssetsForChain(ETHEREUM_CHAIN_ID);

            expect(assets?.assets).toHaveLength(1);
        });
    });

    describe("plain address format", () => {
        it("returns addresses in plain 0x format", async () => {
            mockSuccessfulFetch();

            const assets = await service.getAssetsForChain(ETHEREUM_CHAIN_ID);
            const usdc = assets?.assets.find((a) => a.symbol === "USDC");

            expect(usdc?.address).toBe(USDC_ADDRESS);
            expect(usdc?.decimals).toBe(6);
        });
    });

    describe("getAssetsForChain", () => {
        it("returns assets for a supported chain", async () => {
            mockSuccessfulFetch();

            const result = await service.getAssetsForChain(ETHEREUM_CHAIN_ID);

            expect(result?.chainId).toBe(ETHEREUM_CHAIN_ID);
            expect(result?.assets).toHaveLength(ETHEREUM_CURRENCY_COUNT);
        });

        it("returns null for an unsupported chain", async () => {
            mockSuccessfulFetch();

            const result = await service.getAssetsForChain(UNSUPPORTED_CHAIN_ID);

            expect(result).toBeNull();
        });
    });

    describe("isAssetSupported", () => {
        it("finds asset with case-insensitive address comparison", async () => {
            mockSuccessfulFetch();

            const assets = await service.getAssetsForChain(ETHEREUM_CHAIN_ID);
            const usdcAddress = assets!.assets.find((a) => a.symbol === "USDC")!.address;

            const upper = await service.isAssetSupported(ETHEREUM_CHAIN_ID, usdcAddress);
            expect(upper?.symbol).toBe("USDC");

            const lower = await service.isAssetSupported(
                ETHEREUM_CHAIN_ID,
                usdcAddress.toLowerCase(),
            );
            expect(lower?.symbol).toBe("USDC");
        });

        it("returns null for non-existent asset", async () => {
            mockSuccessfulFetch();

            const result = await service.isAssetSupported(ETHEREUM_CHAIN_ID, ZERO_ADDRESS);

            expect(result).toBeNull();
        });
    });

    describe("getSupportedChainIds", () => {
        it("returns list of supported chain IDs", async () => {
            mockSuccessfulFetch();

            const result = await service.getSupportedChainIds();

            expect(result).toEqual([ETHEREUM_CHAIN_ID, OPTIMISM_CHAIN_ID]);
        });
    });

    describe("error handling", () => {
        it("throws AssetDiscoveryFailure when /chains response fails validation", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                data: { notChains: [] },
            });

            await expect(service.getSupportedAssets()).rejects.toThrow(AssetDiscoveryFailure);
        });

        it("wraps /chains network error in AssetDiscoveryFailure with providerId", async () => {
            const axiosError = new AxiosError("timeout of 30000ms exceeded");
            axiosError.code = "ECONNABORTED";
            axiosError.config = { url: CHAINS_ENDPOINT } as never;
            vi.mocked(axios.get).mockRejectedValueOnce(axiosError);

            try {
                await service.getSupportedAssets();
                expect.fail("Expected to throw");
            } catch (error) {
                expect(error).toBeInstanceOf(AssetDiscoveryFailure);
                expect((error as AssetDiscoveryFailure).message).toMatch(/relay/);
                expect((error as AssetDiscoveryFailure).message).toMatch(/timed out/);
            }
        });

        it("wraps ZodError from invalid /chains response in AssetDiscoveryFailure", async () => {
            vi.mocked(axios.get).mockResolvedValueOnce({
                data: { chains: [{ id: "not-a-number" }] },
            });

            await expect(service.getSupportedAssets()).rejects.toThrow(AssetDiscoveryFailure);
        });
    });

    describe("configured timeout", () => {
        it("uses configured timeout for API requests", async () => {
            const serviceWithTimeout = new RelayAssetDiscoveryService({
                baseUrl: BASE_URL,
                providerId: PROVIDER_ID,
                timeout: CUSTOM_TIMEOUT,
            });

            mockSuccessfulFetch();

            await serviceWithTimeout.getSupportedAssets();

            expect(axios.get).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ timeout: CUSTOM_TIMEOUT }),
            );
        });
    });

    describe("trailing slash normalization", () => {
        it("strips trailing slash from baseUrl", async () => {
            const serviceWithSlash = new RelayAssetDiscoveryService({
                baseUrl: `${BASE_URL}/`,
                providerId: PROVIDER_ID,
            });

            mockSuccessfulFetch();

            await serviceWithSlash.getSupportedAssets();

            expect(axios.get).toHaveBeenCalledWith(CHAINS_ENDPOINT, expect.anything());
        });
    });

    describe("in-flight request deduplication", () => {
        it("dedupes concurrent calls to a single fetch cycle", async () => {
            let resolveChains: (value: unknown) => void;
            const delayedChains = new Promise((resolve) => {
                resolveChains = resolve;
            });

            vi.mocked(axios.get).mockImplementationOnce(() =>
                delayedChains.then(() => ({ data: MOCK_CHAINS_RESPONSE })),
            );

            const promise1 = service.getSupportedAssets();
            const promise2 = service.getSupportedAssets();

            resolveChains!(undefined);

            const [result1, result2] = await Promise.all([promise1, promise2]);

            expect(axios.get).toHaveBeenCalledTimes(1);
            expect(Object.keys(result1.tokensByChain)).toHaveLength(EVM_CHAIN_COUNT);
            expect(Object.keys(result2.tokensByChain)).toHaveLength(EVM_CHAIN_COUNT);
        });

        it("clears in-flight state on failure and allows retry", async () => {
            vi.mocked(axios.get).mockRejectedValueOnce(new AxiosError("Network error"));

            await expect(service.getSupportedAssets()).rejects.toThrow(AssetDiscoveryFailure);

            mockSuccessfulFetch();

            const result = await service.getSupportedAssets();

            expect(axios.get).toHaveBeenCalledTimes(2);
            expect(Object.keys(result.tokensByChain)).toHaveLength(EVM_CHAIN_COUNT);
        });

        it("applies chainIds filter to deduped result", async () => {
            let resolveChains: (value: unknown) => void;
            const delayedChains = new Promise((resolve) => {
                resolveChains = resolve;
            });

            vi.mocked(axios.get).mockImplementationOnce(() =>
                delayedChains.then(() => ({ data: MOCK_CHAINS_RESPONSE })),
            );

            const promise1 = service.getSupportedAssets({ chainIds: [ETHEREUM_CHAIN_ID] });
            const promise2 = service.getSupportedAssets({ chainIds: [OPTIMISM_CHAIN_ID] });

            resolveChains!(undefined);

            const [result1, result2] = await Promise.all([promise1, promise2]);

            expect(axios.get).toHaveBeenCalledTimes(1);

            expect(Object.keys(result1.tokensByChain)).toHaveLength(1);
            expect(Object.keys(result1.tokensByChain)).toContain(String(ETHEREUM_CHAIN_ID));

            expect(Object.keys(result2.tokensByChain)).toHaveLength(1);
            expect(Object.keys(result2.tokensByChain)).toContain(String(OPTIMISM_CHAIN_ID));
        });
    });
});
