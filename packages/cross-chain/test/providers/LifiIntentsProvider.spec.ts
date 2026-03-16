import { OrderStatus } from "@openintentsframework/oif-specs";
import axios, { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { QuoteRequest } from "../../src/core/schemas/quoteRequest.js";
import { OrderFailureReason } from "../../src/core/types/orderTracking.js";
import {
    LifiIntentsProvider,
    ProviderConfigFailure,
    ProviderGetQuoteFailure,
} from "../../src/external.js";
import {
    getMockedLifiEmptyQuoteResponse,
    getMockedLifiNullOrderResponse,
    getMockedLifiQuoteResponse,
    LIFI_ADDRESSES,
    LIFI_CHAIN_IDS,
} from "../mocks/lifi-intents/index.js";

vi.mock("axios");

const MOCK_ORDER_SERVER_URL = "https://order.li.fi";
const MOCK_PROVIDER_ID = "lifi-intents-test";

describe("LifiIntentsProvider", () => {
    const provider = new LifiIntentsProvider({
        orderServerUrl: MOCK_ORDER_SERVER_URL,
        providerId: MOCK_PROVIDER_ID,
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("constructor", () => {
        it("creates provider with valid config", () => {
            expect(provider.protocolName).toBe("lifi-intents");
            expect(provider.providerId).toBe(MOCK_PROVIDER_ID);
        });

        it("defaults providerId to lifi-intents", () => {
            const defaultProvider = new LifiIntentsProvider({
                orderServerUrl: MOCK_ORDER_SERVER_URL,
            });
            expect(defaultProvider.providerId).toBe("lifi-intents");
        });

        it("throws for invalid config (bad URL)", () => {
            expect(() => {
                new LifiIntentsProvider({
                    orderServerUrl: "not-a-url",
                });
            }).toThrow(ProviderConfigFailure);
        });

        it("throws for empty config", () => {
            expect(() => {
                // @ts-expect-error - Testing invalid config
                new LifiIntentsProvider({});
            }).toThrow(ProviderConfigFailure);
        });

        it("throws ProviderConfigFailure for non-ZodError thrown during config", async () => {
            const schemas = await import("../../src/protocols/lifi-intents/schemas.js");
            const spy = vi
                .spyOn(schemas.LifiIntentsProviderConfigSchema, "parse")
                .mockImplementation((): never => {
                    throw new TypeError("unexpected internal error");
                });

            try {
                expect(
                    () => new LifiIntentsProvider({ orderServerUrl: MOCK_ORDER_SERVER_URL }),
                ).toThrow(ProviderConfigFailure);
            } finally {
                spy.mockRestore();
            }
        });
    });

    describe("getQuotes", () => {
        const mockQuoteRequest: QuoteRequest = {
            user: LIFI_ADDRESSES.USER,
            input: {
                chainId: LIFI_CHAIN_IDS.BASE,
                assetAddress: LIFI_ADDRESSES.USDC_BASE,
                amount: "10000000",
            },
            output: {
                chainId: LIFI_CHAIN_IDS.ARBITRUM,
                assetAddress: LIFI_ADDRESSES.USDC_ARB,
            },
            swapType: "exact-input",
        };

        it("calls integrator endpoint with correct URL", async () => {
            vi.mocked(axios.post).mockResolvedValue({
                status: 200,
                data: getMockedLifiQuoteResponse(),
            });

            await provider.getQuotes(mockQuoteRequest);

            expect(axios.post).toHaveBeenCalledWith(
                `${MOCK_ORDER_SERVER_URL}/api/v1/integrator/quote/request`,
                expect.objectContaining({
                    user: expect.objectContaining({ chain: `eip155:${LIFI_CHAIN_IDS.BASE}` }),
                    intent: expect.objectContaining({ intentType: "oif-swap" }),
                    supportedTypes: ["oif-user-open-v0"],
                }),
                expect.objectContaining({
                    headers: { "Content-Type": "application/json" },
                    timeout: 30_000,
                }),
            );
        });

        it("includes custom headers when configured", async () => {
            const customProvider = new LifiIntentsProvider({
                orderServerUrl: MOCK_ORDER_SERVER_URL,
                providerId: MOCK_PROVIDER_ID,
                headers: { "X-Api-Key": "my-key" },
            });

            vi.mocked(axios.post).mockResolvedValue({
                status: 200,
                data: getMockedLifiQuoteResponse(),
            });

            await customProvider.getQuotes(mockQuoteRequest);

            const callArgs = vi.mocked(axios.post).mock.calls[0]!;
            const config = callArgs[2] as { headers: Record<string, string> };
            expect(config.headers["X-Api-Key"]).toBe("my-key");
        });

        it("returns Quote array with valid structure", async () => {
            vi.mocked(axios.post).mockResolvedValue({
                status: 200,
                data: getMockedLifiQuoteResponse(),
            });

            const quotes = await provider.getQuotes(mockQuoteRequest);

            expect(quotes).toHaveLength(1);
            expect(quotes[0]).toHaveProperty("order");
            expect(quotes[0]).toHaveProperty("preview");
            expect(quotes[0]).toHaveProperty("provider", MOCK_PROVIDER_ID);
            expect(quotes[0]!.order.steps).toBeDefined();
            expect(quotes[0]!.order.steps.length).toBeGreaterThan(0);
        });

        it("returns transaction step for oif-user-open-v0 orders", async () => {
            vi.mocked(axios.post).mockResolvedValue({
                status: 200,
                data: getMockedLifiQuoteResponse(),
            });

            const quotes = await provider.getQuotes(mockQuoteRequest);
            expect(quotes[0]!.order.steps[0]!.kind).toBe("transaction");
        });

        it("returns empty array when no quotes", async () => {
            vi.mocked(axios.post).mockResolvedValue({
                status: 200,
                data: getMockedLifiEmptyQuoteResponse(),
            });

            const quotes = await provider.getQuotes(mockQuoteRequest);
            expect(quotes).toHaveLength(0);
        });

        it("filters out quotes with null order", async () => {
            vi.mocked(axios.post).mockResolvedValue({
                status: 200,
                data: getMockedLifiNullOrderResponse(),
            });

            const quotes = await provider.getQuotes(mockQuoteRequest);
            expect(quotes).toHaveLength(0);
        });

        it("throws ProviderGetQuoteFailure with API message on HTTP error", async () => {
            const error = new AxiosError("Request failed", "ERR_BAD_REQUEST");
            error.response = {
                status: 400,
                data: { message: "No Polymer oracle configured for input chain ID: 10" },
                statusText: "Bad Request",
                headers: {},
                config: { headers: {} },
            } as AxiosError["response"];
            vi.mocked(axios.post).mockRejectedValue(error);

            await expect(provider.getQuotes(mockQuoteRequest)).rejects.toThrow(
                /No Polymer oracle configured/,
            );
        });

        it("throws ProviderGetQuoteFailure on AxiosError without response data", async () => {
            const error = new AxiosError("Connection refused", "ECONNREFUSED");
            error.message = "Connection refused";
            vi.mocked(axios.post).mockRejectedValue(error);

            await expect(provider.getQuotes(mockQuoteRequest)).rejects.toThrow(
                /Connection refused/,
            );
        });

        it("throws ProviderGetQuoteFailure with original message on generic error", async () => {
            vi.mocked(axios.post).mockRejectedValue(new TypeError("Cannot read property"));

            await expect(provider.getQuotes(mockQuoteRequest)).rejects.toThrow(
                /Cannot read property/,
            );
        });

        it("throws ProviderGetQuoteFailure on invalid response schema", async () => {
            vi.mocked(axios.post).mockResolvedValue({
                status: 200,
                data: { invalid: "response" },
            });

            await expect(provider.getQuotes(mockQuoteRequest)).rejects.toThrow(
                ProviderGetQuoteFailure,
            );
        });

        it("throws ProviderGetQuoteFailure on non-200 status", async () => {
            vi.mocked(axios.post).mockResolvedValue({
                status: 500,
                data: {},
            });

            await expect(provider.getQuotes(mockQuoteRequest)).rejects.toThrow(
                ProviderGetQuoteFailure,
            );
        });
    });

    describe("getTrackingConfig", () => {
        it("returns OIF opened intent parser config", () => {
            const config = provider.getTrackingConfig();
            expect(config.openedIntentParserConfig).toEqual({ type: "oif" });
        });

        it("returns API-based fill watcher config", () => {
            const config = provider.getTrackingConfig();
            expect(config.fillWatcherConfig.type).toBe("api-based");
        });
    });

    describe("getDiscoveryConfig", () => {
        it("returns custom-api type config", () => {
            const config = provider.getDiscoveryConfig();
            expect(config.type).toBe("custom-api");
        });

        it("points to /routes endpoint", () => {
            const config = provider.getDiscoveryConfig();
            expect(config.config.assetsEndpoint).toBe(`${MOCK_ORDER_SERVER_URL}/routes`);
        });

        it("parseResponse handles valid routes data", () => {
            const config = provider.getDiscoveryConfig();
            const mockRoutes = {
                routes: [
                    {
                        fromChain: { chainId: "8453" },
                        toChain: { chainId: "42161" },
                        fromToken: { symbol: "USDC", name: "USDC", address: "0xaaaa", decimals: 6 },
                        toToken: { symbol: "USDC", name: "USDC", address: "0xbbbb", decimals: 6 },
                    },
                    {
                        fromChain: { chainId: "8453" },
                        toChain: { chainId: "1" },
                        fromToken: {
                            symbol: "WETH",
                            name: "WETH",
                            address: "0xcccc",
                            decimals: 18,
                        },
                        toToken: { symbol: "USDC", name: "USDC", address: "0xdddd", decimals: 6 },
                    },
                ],
            };

            const result = config.config.parseResponse(mockRoutes);
            expect(result.length).toBeGreaterThanOrEqual(2);

            const baseChain = result.find((r) => r.chainId === 8453);
            expect(baseChain).toBeDefined();
            expect(baseChain!.assets.length).toBe(2);
            expect(baseChain!.assets[0]!.symbol).toBe("USDC");
            expect(baseChain!.assets[0]!.decimals).toBe(6);
        });

        it("parseResponse deduplicates assets per chain", () => {
            const config = provider.getDiscoveryConfig();
            const mockRoutes = {
                routes: [
                    {
                        fromChain: { chainId: "8453" },
                        toChain: { chainId: "42161" },
                        fromToken: { symbol: "USDC", name: "USDC", address: "0xaaaa", decimals: 6 },
                        toToken: { symbol: "USDC", name: "USDC", address: "0xbbbb", decimals: 6 },
                    },
                    {
                        fromChain: { chainId: "8453" },
                        toChain: { chainId: "1" },
                        fromToken: { symbol: "USDC", name: "USDC", address: "0xaaaa", decimals: 6 },
                        toToken: { symbol: "ETH", name: "ETH", address: "0xcccc", decimals: 18 },
                    },
                ],
            };

            const result = config.config.parseResponse(mockRoutes);
            const baseChain = result.find((r) => r.chainId === 8453);
            expect(baseChain!.assets).toHaveLength(1);
        });
    });

    describe("getFillWatcherConfig (static)", () => {
        const fillParams = {
            orderId: "0xdeadbeef" as `0x${string}`,
            originChainId: 8453,
            destinationChainId: 42161,
        };

        it("builds endpoint with orderId param", () => {
            const config = LifiIntentsProvider.getFillWatcherConfig(MOCK_ORDER_SERVER_URL);
            const endpoint = config.buildEndpoint(fillParams);
            expect(endpoint).toBe("/orders/status?onChainOrderId=0xdeadbeef");
        });

        it("extractFillEvent returns Pending for empty data", () => {
            const config = LifiIntentsProvider.getFillWatcherConfig(MOCK_ORDER_SERVER_URL);
            const result = config.extractFillEvent({ data: [] }, fillParams);

            expect(result.event).toBeNull();
            expect(result.status).toBe(OrderStatus.Pending);
        });

        it("extractFillEvent maps Settled to Finalized with fill event", () => {
            const config = LifiIntentsProvider.getFillWatcherConfig(MOCK_ORDER_SERVER_URL);
            const orderId = "0x1234567890abcdef" as `0x${string}`;
            const result = config.extractFillEvent(
                {
                    data: [
                        {
                            meta: {
                                orderStatus: "Settled",
                                onChainOrderId: orderId,
                                orderDeliveredTxHash: "0xfillhash",
                                settledAt: "2025-01-15T10:00:00Z",
                            },
                        },
                    ],
                },
                { ...fillParams, orderId },
            );

            expect(result.status).toBe(OrderStatus.Finalized);
            expect(result.event).not.toBeNull();
            expect(result.event!.fillTxHash).toBe("0xfillhash");
            expect(result.event!.originChainId).toBe(8453);
        });

        it("extractFillEvent maps Delivered to Executing (no fill event)", () => {
            const config = LifiIntentsProvider.getFillWatcherConfig(MOCK_ORDER_SERVER_URL);
            const result = config.extractFillEvent(
                {
                    data: [
                        {
                            meta: {
                                orderStatus: "Delivered",
                                onChainOrderId: "0xabc",
                            },
                        },
                    ],
                },
                { ...fillParams, orderId: "0xabc" as `0x${string}` },
            );

            expect(result.status).toBe(OrderStatus.Executing);
            expect(result.event).toBeNull();
        });

        it("extractFillEvent returns Failed with DeadlineExceeded when expiredAt is set", () => {
            const config = LifiIntentsProvider.getFillWatcherConfig(MOCK_ORDER_SERVER_URL);
            const result = config.extractFillEvent(
                {
                    data: [
                        {
                            meta: {
                                orderStatus: "Expired",
                                onChainOrderId: fillParams.orderId,
                                expiredAt: "2025-01-15T12:00:00Z",
                            },
                        },
                    ],
                },
                fillParams,
            );

            expect(result.status).toBe(OrderStatus.Failed);
            expect(result.event).toBeNull();
            expect(result.failureReason).toBe(OrderFailureReason.DeadlineExceeded);
        });

        it("extractFillEvent returns Failed with Unknown when no expiredAt", () => {
            const config = LifiIntentsProvider.getFillWatcherConfig(MOCK_ORDER_SERVER_URL);
            const result = config.extractFillEvent(
                {
                    data: [
                        {
                            meta: {
                                orderStatus: "Failed",
                                onChainOrderId: fillParams.orderId,
                            },
                        },
                    ],
                },
                fillParams,
            );

            expect(result.status).toBe(OrderStatus.Failed);
            expect(result.event).toBeNull();
            expect(result.failureReason).toBe(OrderFailureReason.Unknown);
        });

        it("extractFillEvent returns null event when Finalized but no fillTxHash", () => {
            const config = LifiIntentsProvider.getFillWatcherConfig(MOCK_ORDER_SERVER_URL);
            const result = config.extractFillEvent(
                {
                    data: [
                        {
                            meta: {
                                orderStatus: "Settled",
                                onChainOrderId: fillParams.orderId,
                            },
                        },
                    ],
                },
                fillParams,
            );

            expect(result.status).toBe(OrderStatus.Finalized);
            expect(result.event).toBeNull();
        });

        it("extractFillEvent matches by onChainOrderId among multiple entries", () => {
            const config = LifiIntentsProvider.getFillWatcherConfig(MOCK_ORDER_SERVER_URL);
            const targetId = "0xtarget" as `0x${string}`;
            const result = config.extractFillEvent(
                {
                    data: [
                        {
                            meta: {
                                orderStatus: "Signed",
                                onChainOrderId: "0xother",
                            },
                        },
                        {
                            meta: {
                                orderStatus: "Settled",
                                onChainOrderId: targetId,
                                orderDeliveredTxHash: "0xfill",
                                settledAt: "2025-06-01T00:00:00Z",
                            },
                        },
                    ],
                },
                { ...fillParams, orderId: targetId },
            );

            expect(result.status).toBe(OrderStatus.Finalized);
            expect(result.event!.fillTxHash).toBe("0xfill");
        });

        it("extractFillEvent falls back to data[0] when no onChainOrderId match", () => {
            const config = LifiIntentsProvider.getFillWatcherConfig(MOCK_ORDER_SERVER_URL);
            const result = config.extractFillEvent(
                {
                    data: [
                        {
                            meta: {
                                orderStatus: "Delivered",
                                onChainOrderId: "0xdifferent",
                            },
                        },
                    ],
                },
                { ...fillParams, orderId: "0xnonexistent" as `0x${string}` },
            );

            expect(result.status).toBe(OrderStatus.Executing);
        });

        it("extractFillEvent uses Date.now() when settledAt is missing", () => {
            const config = LifiIntentsProvider.getFillWatcherConfig(MOCK_ORDER_SERVER_URL);
            const nowSec = Math.floor(Date.now() / 1000);
            const result = config.extractFillEvent(
                {
                    data: [
                        {
                            meta: {
                                orderStatus: "Settled",
                                onChainOrderId: fillParams.orderId,
                                orderDeliveredTxHash: "0xfill",
                            },
                        },
                    ],
                },
                fillParams,
            );

            expect(result.event).not.toBeNull();
            expect(result.event!.timestamp).toBeGreaterThanOrEqual(nowSec - 2);
            expect(result.event!.timestamp).toBeLessThanOrEqual(nowSec + 2);
        });

        it("extractFillEvent returns Pending on malformed status response", () => {
            const config = LifiIntentsProvider.getFillWatcherConfig(MOCK_ORDER_SERVER_URL);
            const result = config.extractFillEvent(
                { notData: "garbage" } as unknown as Parameters<typeof config.extractFillEvent>[0],
                fillParams,
            );

            expect(result.event).toBeNull();
            expect(result.status).toBe(OrderStatus.Pending);
        });
    });
});
