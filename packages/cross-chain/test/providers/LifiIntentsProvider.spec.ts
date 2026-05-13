import { OrderStatus } from "@openintentsframework/oif-specs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { QuoteRequest } from "../../src/core/schemas/quoteRequest.js";
import { HttpError } from "../../src/core/errors/HttpError.exception.js";
import { HttpNetworkError } from "../../src/core/errors/HttpNetworkError.exception.js";
import { OrderFailureReason } from "../../src/core/types/orderTracking.js";
import { httpRequest } from "../../src/core/utils/httpClient.js";
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

vi.mock("../../src/core/utils/httpClient.js", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../src/core/utils/httpClient.js")>();
    return {
        ...actual,
        httpRequest: vi.fn(),
    };
});

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
            vi.mocked(httpRequest).mockResolvedValue({
                status: 200,
                data: getMockedLifiQuoteResponse(),
                headers: new Headers(),
            });

            await provider.getQuotes(mockQuoteRequest);

            expect(httpRequest).toHaveBeenCalledWith(
                `${MOCK_ORDER_SERVER_URL}/api/v1/integrator/quote/request`,
                expect.objectContaining({
                    method: "POST",
                    body: expect.objectContaining({
                        user: expect.objectContaining({ chain: `eip155:${LIFI_CHAIN_IDS.BASE}` }),
                        intent: expect.objectContaining({ intentType: "oif-swap" }),
                        supportedTypes: ["oif-user-open-v0"],
                    }),
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

            vi.mocked(httpRequest).mockResolvedValue({
                status: 200,
                data: getMockedLifiQuoteResponse(),
                headers: new Headers(),
            });

            await customProvider.getQuotes(mockQuoteRequest);

            const callArgs = vi.mocked(httpRequest).mock.calls[0]!;
            const options = callArgs[1] as { headers: Record<string, string> };
            expect(options.headers["X-Api-Key"]).toBe("my-key");
        });

        it("returns Quote array with valid structure", async () => {
            vi.mocked(httpRequest).mockResolvedValue({
                status: 200,
                data: getMockedLifiQuoteResponse(),
                headers: new Headers(),
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
            vi.mocked(httpRequest).mockResolvedValue({
                status: 200,
                data: getMockedLifiQuoteResponse(),
                headers: new Headers(),
            });

            const quotes = await provider.getQuotes(mockQuoteRequest);
            expect(quotes[0]!.order.steps[0]!.kind).toBe("transaction");
        });

        it("returns empty array when no quotes", async () => {
            vi.mocked(httpRequest).mockResolvedValue({
                status: 200,
                data: getMockedLifiEmptyQuoteResponse(),
                headers: new Headers(),
            });

            const quotes = await provider.getQuotes(mockQuoteRequest);
            expect(quotes).toHaveLength(0);
        });

        it("filters out quotes with null order", async () => {
            vi.mocked(httpRequest).mockResolvedValue({
                status: 200,
                data: getMockedLifiNullOrderResponse(),
                headers: new Headers(),
            });

            const quotes = await provider.getQuotes(mockQuoteRequest);
            expect(quotes).toHaveLength(0);
        });

        it("throws ProviderGetQuoteFailure on 4xx HTTP error", async () => {
            const url = `${MOCK_ORDER_SERVER_URL}/api/v1/integrator/quote/request`;
            vi.mocked(httpRequest).mockRejectedValue(
                new HttpError("Request failed with status 400", url, 400, {
                    message: "No Polymer oracle configured for input chain ID: 10",
                }),
            );

            await expect(provider.getQuotes(mockQuoteRequest)).rejects.toThrow(
                ProviderGetQuoteFailure,
            );
        });

        it("throws ProviderGetQuoteFailure on 5xx server error", async () => {
            const url = `${MOCK_ORDER_SERVER_URL}/api/v1/integrator/quote/request`;
            vi.mocked(httpRequest).mockRejectedValue(
                new HttpError("Internal Server Error", url, 500, { message: "Internal error" }),
            );

            await expect(provider.getQuotes(mockQuoteRequest)).rejects.toThrow(
                /LI\.FI Intents quote failed/,
            );
        });

        it("throws ProviderGetQuoteFailure on network error (no response)", async () => {
            const url = `${MOCK_ORDER_SERVER_URL}/api/v1/integrator/quote/request`;
            vi.mocked(httpRequest).mockRejectedValue(
                new HttpNetworkError("Connection refused", url),
            );

            await expect(provider.getQuotes(mockQuoteRequest)).rejects.toThrow(
                /Connection refused/,
            );
        });

        it("throws ProviderGetQuoteFailure with original message on generic error", async () => {
            vi.mocked(httpRequest).mockRejectedValue(new TypeError("Cannot read property"));

            await expect(provider.getQuotes(mockQuoteRequest)).rejects.toThrow(
                /Cannot read property/,
            );
        });

        it("throws ProviderGetQuoteFailure on invalid response schema", async () => {
            vi.mocked(httpRequest).mockResolvedValue({
                status: 200,
                data: { invalid: "response" },
                headers: new Headers(),
            });

            await expect(provider.getQuotes(mockQuoteRequest)).rejects.toThrow(
                ProviderGetQuoteFailure,
            );
        });
    });

    describe("getTrackingConfig", () => {
        it("returns LI.FI opened intent parser config", () => {
            const config = provider.getTrackingConfig();
            expect(config.openedIntentParserConfig).toEqual({ type: "lifi-intents" });
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

        it("extractFillEvent returns Pending for empty/invalid response", () => {
            const config = LifiIntentsProvider.getFillWatcherConfig(MOCK_ORDER_SERVER_URL);
            const result = config.extractFillEvent({} as never, fillParams);

            expect(result.event).toBeNull();
            expect(result.status).toBe(OrderStatus.Pending);
        });

        it("extractFillEvent maps Settled to Finalized with fill event", () => {
            const config = LifiIntentsProvider.getFillWatcherConfig(MOCK_ORDER_SERVER_URL);
            const orderId = "0x1234567890abcdef" as `0x${string}`;
            const result = config.extractFillEvent(
                {
                    meta: {
                        orderStatus: "Settled",
                        onChainOrderId: orderId,
                        orderDeliveredTxHash: "0xfillhash",
                        settledAt: "2025-01-15T10:00:00Z",
                    },
                },
                { ...fillParams, orderId },
            );

            expect(result.status).toBe(OrderStatus.Finalized);
            expect(result.event).not.toBeNull();
            expect(result.event!.fillTxHash).toBe("0xfillhash");
            expect(result.event!.originChainId).toBe(8453);
        });

        it("extractFillEvent maps Delivered to Settling (no fill event)", () => {
            const config = LifiIntentsProvider.getFillWatcherConfig(MOCK_ORDER_SERVER_URL);
            const result = config.extractFillEvent(
                {
                    meta: {
                        orderStatus: "Delivered",
                        onChainOrderId: "0xabc",
                    },
                },
                { ...fillParams, orderId: "0xabc" as `0x${string}` },
            );

            expect(result.status).toBe(OrderStatus.Settling);
            expect(result.event).toBeNull();
        });

        it("extractFillEvent returns Failed with DeadlineExceeded when expiredAt is set", () => {
            const config = LifiIntentsProvider.getFillWatcherConfig(MOCK_ORDER_SERVER_URL);
            const result = config.extractFillEvent(
                {
                    meta: {
                        orderStatus: "Expired",
                        onChainOrderId: fillParams.orderId,
                        expiredAt: "2025-01-15T12:00:00Z",
                    },
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
                    meta: {
                        orderStatus: "Failed",
                        onChainOrderId: fillParams.orderId,
                    },
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
                    meta: {
                        orderStatus: "Settled",
                        onChainOrderId: fillParams.orderId,
                    },
                },
                fillParams,
            );

            expect(result.status).toBe(OrderStatus.Finalized);
            expect(result.event).toBeNull();
        });

        it("extractFillEvent reads meta directly from flat response object", () => {
            const config = LifiIntentsProvider.getFillWatcherConfig(MOCK_ORDER_SERVER_URL);
            const targetId = "0xtarget" as `0x${string}`;
            const result = config.extractFillEvent(
                {
                    meta: {
                        orderStatus: "Settled",
                        onChainOrderId: targetId,
                        orderDeliveredTxHash: "0xfill",
                        settledAt: "2025-06-01T00:00:00Z",
                    },
                },
                { ...fillParams, orderId: targetId },
            );

            expect(result.status).toBe(OrderStatus.Finalized);
            expect(result.event!.fillTxHash).toBe("0xfill");
        });

        it("extractFillEvent uses Date.now() when settledAt is missing", () => {
            const config = LifiIntentsProvider.getFillWatcherConfig(MOCK_ORDER_SERVER_URL);
            const nowSec = Math.floor(Date.now() / 1000);
            const result = config.extractFillEvent(
                {
                    meta: {
                        orderStatus: "Settled",
                        onChainOrderId: fillParams.orderId,
                        orderDeliveredTxHash: "0xfill",
                    },
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

    describe("getOrderExplorers", () => {
        it("returns origin and destination chain explorer URLs (no bridge tracker)", () => {
            const explorers = provider.getOrderExplorers({
                originChainId: 8453,
                originTxHash: "0xaaaa",
                destinationChainId: 42161,
                destinationTxHash: "0xbbbb",
            });
            expect(explorers.tracker).toBeUndefined();
            expect(explorers.origin).toBe("https://basescan.org/tx/0xaaaa");
            expect(explorers.destination).toBe("https://arbiscan.io/tx/0xbbbb");
        });

        it("omits destination until the fill tx hash is observed", () => {
            const explorers = provider.getOrderExplorers({
                originChainId: 8453,
                originTxHash: "0xaaaa",
                destinationChainId: 42161,
            });
            expect(explorers.origin).toBe("https://basescan.org/tx/0xaaaa");
            expect(explorers.destination).toBeUndefined();
        });
    });
});
