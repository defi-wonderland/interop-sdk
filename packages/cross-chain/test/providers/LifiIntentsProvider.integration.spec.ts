import { OrderStatus } from "@openintentsframework/oif-specs";
import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { QuoteRequest } from "../../src/core/schemas/quoteRequest.js";
import { createCrossChainProvider, LifiIntentsProvider } from "../../src/external.js";
import {
    getMockedLifiQuoteResponse,
    LIFI_ADDRESSES,
    LIFI_CHAIN_IDS,
} from "../mocks/lifi-intents/index.js";

vi.mock("axios");

const MOCK_ORDER_SERVER_URL = "https://order.li.fi";

describe("LifiIntentsProvider Integration Tests", () => {
    afterEach(() => {
        vi.mocked(axios.post).mockClear();
        vi.mocked(axios.get).mockClear();
    });
    describe("factory creation", () => {
        it("creates LifiIntentsProvider via createCrossChainProvider", () => {
            const provider = createCrossChainProvider("lifi-intents", {
                orderServerUrl: MOCK_ORDER_SERVER_URL,
            });

            expect(provider).toBeInstanceOf(LifiIntentsProvider);
            expect(provider.protocolName).toBe("lifi-intents");
        });

        it("creates LifiIntentsProvider with custom providerId", () => {
            const provider = createCrossChainProvider("lifi-intents", {
                orderServerUrl: MOCK_ORDER_SERVER_URL,
                providerId: "my-custom-id",
            });

            expect(provider.providerId).toBe("my-custom-id");
        });
    });

    describe("end-to-end getQuotes flow", () => {
        it("returns executable SDK quotes from LI.FI response", async () => {
            const provider = new LifiIntentsProvider({
                orderServerUrl: MOCK_ORDER_SERVER_URL,
            });

            vi.mocked(axios.post).mockResolvedValue({
                status: 200,
                data: getMockedLifiQuoteResponse(),
            });

            const request: QuoteRequest = {
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
            };

            const quotes = await provider.getQuotes(request);

            expect(quotes).toHaveLength(1);

            const quote = quotes[0]!;

            // Order should have transaction step (oif-user-open-v0)
            expect(quote.order.steps[0]!.kind).toBe("transaction");

            // Preview should be populated from CAIP-10 -> SDK format
            expect(quote.preview.inputs[0]!.chainId).toBe(LIFI_CHAIN_IDS.BASE);
            expect(quote.preview.inputs[0]!.assetAddress).toBe(LIFI_ADDRESSES.USDC_BASE);
            expect(quote.preview.outputs[0]!.chainId).toBe(LIFI_CHAIN_IDS.ARBITRUM);
            expect(quote.preview.outputs[0]!.assetAddress).toBe(LIFI_ADDRESSES.USDC_ARB);

            // Metadata should carry through
            expect(quote.metadata).toHaveProperty("exclusiveFor");
            expect(quote.metadata).toHaveProperty("lifiProvider", "LI.FI Intent");
        });

        it("request is properly formatted as CAIP-10", async () => {
            const provider = new LifiIntentsProvider({
                orderServerUrl: MOCK_ORDER_SERVER_URL,
            });

            vi.mocked(axios.post).mockResolvedValue({
                status: 200,
                data: getMockedLifiQuoteResponse(),
            });

            await provider.getQuotes({
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
            });

            const postBody = vi.mocked(axios.post).mock.calls[0]![1] as Record<string, unknown>;

            // Verify CAIP-10 format
            expect(postBody.user).toEqual({
                chain: `eip155:${LIFI_CHAIN_IDS.BASE}`,
                address: LIFI_ADDRESSES.USER,
            });
            expect(postBody.supportedTypes).toEqual(["oif-user-open-v0"]);
        });
    });

    describe("tracking config integration", () => {
        it("fill watcher config works with realistic status response", () => {
            const config = LifiIntentsProvider.getFillWatcherConfig(MOCK_ORDER_SERVER_URL);

            const orderId = "0x" + "ab".repeat(32);
            const fillTxHash = "0x" + "cd".repeat(32);

            const statusResponse = {
                data: [
                    {
                        meta: {
                            submitTime: 1700000000,
                            orderStatus: "Settled",
                            orderIdentifier: "order_123",
                            onChainOrderId: orderId,
                            signedAt: "2025-01-15T10:00:00Z",
                            deliveredAt: "2025-01-15T10:01:00Z",
                            settledAt: "2025-01-15T10:02:00Z",
                            expiredAt: null,
                            orderInitiatedTxHash: "0x" + "11".repeat(32),
                            orderDeliveredTxHash: fillTxHash,
                            orderVerifiedTxHash: "0x" + "33".repeat(32),
                            orderSettledTxHash: "0x" + "44".repeat(32),
                        },
                    },
                ],
            };

            const result = config.extractFillEvent(statusResponse, {
                orderId: orderId as `0x${string}`,
                originChainId: LIFI_CHAIN_IDS.BASE,
                destinationChainId: LIFI_CHAIN_IDS.ARBITRUM,
            });

            expect(result.status).toBe(OrderStatus.Finalized);
            expect(result.event).not.toBeNull();
            expect(result.event!.fillTxHash).toBe(fillTxHash);
            expect(result.event!.originChainId).toBe(LIFI_CHAIN_IDS.BASE);
            expect(result.event!.orderId).toBe(orderId);
        });
    });

    describe("discovery config integration", () => {
        it("parseResponse produces correct NetworkAssets from real-like routes", () => {
            const provider = new LifiIntentsProvider({
                orderServerUrl: MOCK_ORDER_SERVER_URL,
            });

            const config = provider.getDiscoveryConfig();

            const routesData = {
                routes: [
                    {
                        fromChain: { chainId: "8453", name: "Base" },
                        toChain: { chainId: "42161", name: "Arbitrum" },
                        fromToken: {
                            symbol: "USDC",
                            name: "USDC",
                            address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                            decimals: 6,
                        },
                        toToken: {
                            symbol: "USDC",
                            name: "USDC",
                            address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                            decimals: 6,
                        },
                    },
                    {
                        fromChain: { chainId: "1", name: "Ethereum" },
                        toChain: { chainId: "8453", name: "Base" },
                        fromToken: {
                            symbol: "USDC",
                            name: "USDC",
                            address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                            decimals: 6,
                        },
                        toToken: {
                            symbol: "USDC",
                            name: "USDC",
                            address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                            decimals: 6,
                        },
                    },
                ],
            };

            const result = config.config.parseResponse(routesData);

            const chains = result.map((r) => r.chainId).sort((a, b) => a - b);
            expect(chains).toContain(1);
            expect(chains).toContain(8453);
            expect(chains).toContain(42161);

            const baseAssets = result.find((r) => r.chainId === 8453);
            expect(baseAssets).toBeDefined();
            expect(baseAssets!.assets.length).toBeGreaterThanOrEqual(1);
            expect(baseAssets!.assets[0]!.symbol).toBe("USDC");
            expect(baseAssets!.assets[0]!.decimals).toBe(6);
        });
    });
});
