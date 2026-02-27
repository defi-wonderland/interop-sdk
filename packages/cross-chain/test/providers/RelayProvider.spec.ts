import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { QuoteRequest } from "../../src/core/types/quoteRequest.js";
import {
    ProviderConfigFailure,
    ProviderGetQuoteFailure,
    RelayProvider,
} from "../../src/external.js";
import { OrderFailureReason, OrderStatus } from "../../src/internal.js";
import { CHAIN_IDS, TEST_ADDRESSES, TEST_AMOUNTS, TESTNET_TOKENS } from "../mocks/fixtures.js";
import { getMockedRelayMultiStepResponse, getMockedRelayQuoteResponse } from "../mocks/relayApi.js";

const MOCK_API_URL = "https://mocked.relay.url";

vi.mock("axios");

describe("RelayProvider", () => {
    const provider = new RelayProvider({
        apiUrl: MOCK_API_URL,
        providerId: "mocked",
    });

    const mockRelayResponse = getMockedRelayQuoteResponse();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(axios.post).mockResolvedValue({
            status: 200,
            data: mockRelayResponse,
        });
    });

    describe("constructor", () => {
        it("creates provider with default config", () => {
            const p = new RelayProvider({});
            expect(p.protocolName).toBe("relay");
            expect(p.providerId).toMatch(/^relay_/);
        });

        it("generates unique providerId per instance when not specified", () => {
            const p1 = new RelayProvider({});
            const p2 = new RelayProvider({});
            expect(p1.providerId).not.toBe(p2.providerId);
        });

        it("creates provider with custom config", () => {
            const p = new RelayProvider({
                apiUrl: "https://custom.relay.url",
                apiKey: "test-key",
                source: "test-source",
                providerId: "custom-relay",
            });
            expect(p.protocolName).toBe("relay");
            expect(p.providerId).toBe("custom-relay");
        });

        it("throws ProviderConfigFailure for invalid config", () => {
            expect(() => {
                // @ts-expect-error - Testing invalid config
                new RelayProvider({ isTestnet: "not-a-boolean" });
            }).toThrow(ProviderConfigFailure);
        });
    });

    describe("getQuotes", () => {
        const baseRequest: QuoteRequest = {
            user: { chainId: CHAIN_IDS.SEPOLIA, address: TEST_ADDRESSES.USER },
            intent: {
                inputs: [
                    {
                        asset: {
                            chainId: CHAIN_IDS.SEPOLIA,
                            address: TESTNET_TOKENS.WETH_SEPOLIA,
                        },
                        amount: TEST_AMOUNTS.ONE_ETHER.toString(),
                    },
                ],
                outputs: [
                    {
                        asset: {
                            chainId: CHAIN_IDS.BASE_SEPOLIA,
                            address: TESTNET_TOKENS.WETH_BASE_SEPOLIA,
                        },
                        recipient: {
                            chainId: CHAIN_IDS.BASE_SEPOLIA,
                            address: TEST_ADDRESSES.RECEIVER,
                        },
                    },
                ],
                swapType: "exact-input",
            },
        };

        it("calls Relay API with correct parameters", async () => {
            await provider.getQuotes(baseRequest);

            expect(axios.post).toHaveBeenCalledWith(
                `${MOCK_API_URL}/quote/v2`,
                {
                    user: TEST_ADDRESSES.USER,
                    originChainId: CHAIN_IDS.SEPOLIA,
                    destinationChainId: CHAIN_IDS.BASE_SEPOLIA,
                    originCurrency: TESTNET_TOKENS.WETH_SEPOLIA,
                    destinationCurrency: TESTNET_TOKENS.WETH_BASE_SEPOLIA,
                    amount: TEST_AMOUNTS.ONE_ETHER.toString(),
                    tradeType: "EXACT_INPUT",
                    recipient: TEST_ADDRESSES.RECEIVER,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                },
            );
        });

        it("omits recipient when same as user", async () => {
            const request: QuoteRequest = {
                user: { chainId: CHAIN_IDS.SEPOLIA, address: TEST_ADDRESSES.USER },
                intent: {
                    inputs: [
                        {
                            asset: {
                                chainId: CHAIN_IDS.SEPOLIA,
                                address: TESTNET_TOKENS.WETH_SEPOLIA,
                            },
                            amount: TEST_AMOUNTS.ONE_ETHER.toString(),
                        },
                    ],
                    outputs: [
                        {
                            asset: {
                                chainId: CHAIN_IDS.BASE_SEPOLIA,
                                address: TESTNET_TOKENS.WETH_BASE_SEPOLIA,
                            },
                            // No explicit recipient — defaults to user
                        },
                    ],
                    swapType: "exact-input",
                },
            };

            await provider.getQuotes(request);

            const callArgs = vi.mocked(axios.post).mock.calls[0]!;
            const body = callArgs[1] as Record<string, unknown>;
            expect(body.recipient).toBeUndefined();
        });

        it("sends EXACT_OUTPUT trade type for exact-output swaps", async () => {
            const request: QuoteRequest = {
                user: { chainId: CHAIN_IDS.SEPOLIA, address: TEST_ADDRESSES.USER },
                intent: {
                    inputs: [
                        {
                            asset: {
                                chainId: CHAIN_IDS.SEPOLIA,
                                address: TESTNET_TOKENS.WETH_SEPOLIA,
                            },
                        },
                    ],
                    outputs: [
                        {
                            asset: {
                                chainId: CHAIN_IDS.BASE_SEPOLIA,
                                address: TESTNET_TOKENS.WETH_BASE_SEPOLIA,
                            },
                            recipient: {
                                chainId: CHAIN_IDS.BASE_SEPOLIA,
                                address: TEST_ADDRESSES.RECEIVER,
                            },
                            amount: TEST_AMOUNTS.ONE_ETHER.toString(),
                        },
                    ],
                    swapType: "exact-output",
                },
            };

            await provider.getQuotes(request);

            const callArgs = vi.mocked(axios.post).mock.calls[0]!;
            const body = callArgs[1] as Record<string, unknown>;
            expect(body.tradeType).toBe("EXACT_OUTPUT");
            expect(body.amount).toBe(TEST_AMOUNTS.ONE_ETHER.toString());
        });

        it("returns a transaction step", async () => {
            const quotes = await provider.getQuotes(baseRequest);

            expect(quotes).toHaveLength(1);
            const quote = quotes[0]!;
            expect(quote.order.steps.length).toBeGreaterThanOrEqual(1);
            expect(quote.order.steps[0]!.kind).toBe("transaction");
        });

        it("formats preview with InteropAccountId accounts", async () => {
            const quotes = await provider.getQuotes(baseRequest);
            const quote = quotes[0]!;

            expect(quote.preview.inputs[0]!.account).toHaveProperty("chainId");
            expect(quote.preview.inputs[0]!.account).toHaveProperty("address");
            expect(quote.preview.outputs[0]!.account).toHaveProperty("chainId");
            expect(quote.preview.outputs[0]!.account).toHaveProperty("address");
        });

        it("sets correct provider metadata on quote", async () => {
            const quotes = await provider.getQuotes(baseRequest);
            const quote = quotes[0]!;

            expect(quote.provider).toBe("mocked");
            expect(quote.failureHandling).toBe("refund-automatic");
            expect(quote.partialFill).toBe(false);
        });

        it("extracts requestId into quoteId and metadata", async () => {
            const quotes = await provider.getQuotes(baseRequest);
            const quote = quotes[0]!;

            expect(quote.quoteId).toBe("0xabc123def456");
            expect(quote.metadata).toBeDefined();
            expect(quote.metadata!.requestId).toBe("0xabc123def456");
        });

        it("extracts eta from details.timeEstimate", async () => {
            const quotes = await provider.getQuotes(baseRequest);
            const quote = quotes[0]!;

            expect(quote.eta).toBe(30);
        });

        it("produces two transaction steps for approve + deposit response", async () => {
            const multiStepResponse = getMockedRelayMultiStepResponse();
            vi.mocked(axios.post).mockResolvedValueOnce({
                status: 200,
                data: multiStepResponse,
            });

            const quotes = await provider.getQuotes(baseRequest);
            const quote = quotes[0]!;

            expect(quote.order.steps).toHaveLength(2);
            expect(quote.order.steps[0]!.kind).toBe("transaction");
            expect(quote.order.steps[0]!.description).toBe("approve");
            expect(quote.order.steps[1]!.kind).toBe("transaction");
            expect(quote.order.steps[1]!.description).toBe("deposit");
        });

        it("extracts requestId from the deposit step in multi-step response", async () => {
            const multiStepResponse = getMockedRelayMultiStepResponse();
            vi.mocked(axios.post).mockResolvedValueOnce({
                status: 200,
                data: multiStepResponse,
            });

            const quotes = await provider.getQuotes(baseRequest);
            const quote = quotes[0]!;

            expect(quote.quoteId).toBe("0xrequest123");
        });

        it("returns empty array when response contains signature steps", async () => {
            const signatureResponse = getMockedRelayQuoteResponse({
                steps: [
                    {
                        id: "permit",
                        kind: "signature",
                        action: "permit",
                        description: "Sign permit",
                        items: [
                            {
                                status: "incomplete",
                                data: {
                                    from: TEST_ADDRESSES.USER,
                                    to: TESTNET_TOKENS.WETH_SEPOLIA,
                                    data: "0xabcdef",
                                    chainId: CHAIN_IDS.SEPOLIA,
                                },
                            },
                        ],
                    },
                    {
                        id: "deposit",
                        kind: "transaction",
                        requestId: "0xrequest456",
                        items: [
                            {
                                status: "incomplete",
                                data: {
                                    from: TEST_ADDRESSES.USER,
                                    to: "0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC",
                                    data: "0xdeadbeef",
                                    value: TEST_AMOUNTS.ONE_ETHER.toString(),
                                    chainId: CHAIN_IDS.SEPOLIA,
                                },
                            },
                        ],
                    },
                ],
            });
            vi.mocked(axios.post).mockResolvedValueOnce({
                status: 200,
                data: signatureResponse,
            });

            const quotes = await provider.getQuotes(baseRequest);
            expect(quotes).toHaveLength(0);
        });

        it("includes auth headers when apiKey and source are set", async () => {
            const authProvider = new RelayProvider({
                apiUrl: MOCK_API_URL,
                providerId: "auth-mocked",
                apiKey: "test-api-key",
                source: "test-dapp",
            });

            await authProvider.getQuotes(baseRequest);

            const callArgs = vi.mocked(axios.post).mock.calls[0]!;
            const config = callArgs[2] as { headers: Record<string, string> };
            expect(config.headers["Authorization"]).toBe("Bearer test-api-key");
            expect(config.headers["x-relay-source"]).toBe("test-dapp");
        });

        it("throws ProviderGetQuoteFailure on API error", async () => {
            vi.mocked(axios.post).mockRejectedValueOnce(
                Object.assign(new Error("Request failed"), {
                    isAxiosError: true,
                    response: { data: { message: "Invalid request" } },
                    name: "AxiosError",
                    toJSON: () => ({}),
                }),
            );

            await expect(provider.getQuotes(baseRequest)).rejects.toThrow(ProviderGetQuoteFailure);
        });

        it("throws ProviderGetQuoteFailure when exact-input has no input amount", async () => {
            const request: QuoteRequest = {
                user: { chainId: CHAIN_IDS.SEPOLIA, address: TEST_ADDRESSES.USER },
                intent: {
                    inputs: [
                        {
                            asset: {
                                chainId: CHAIN_IDS.SEPOLIA,
                                address: TESTNET_TOKENS.WETH_SEPOLIA,
                            },
                            // No amount
                        },
                    ],
                    outputs: [
                        {
                            asset: {
                                chainId: CHAIN_IDS.BASE_SEPOLIA,
                                address: TESTNET_TOKENS.WETH_BASE_SEPOLIA,
                            },
                        },
                    ],
                    swapType: "exact-input",
                },
            };

            await expect(provider.getQuotes(request)).rejects.toThrow(ProviderGetQuoteFailure);
        });

        it("uses preview amounts from details when available", async () => {
            const quotes = await provider.getQuotes(baseRequest);
            const quote = quotes[0]!;

            // Should use the amounts from details.currencyIn/currencyOut
            expect(quote.preview.inputs[0]!.amount).toBe(TEST_AMOUNTS.ONE_ETHER.toString());
            expect(quote.preview.outputs[0]!.amount).toBe("990000000000000000");
        });

        it("includes relay fees in metadata", async () => {
            const quotes = await provider.getQuotes(baseRequest);
            const quote = quotes[0]!;

            expect(quote.metadata!.relayFees).toBeDefined();
        });
    });

    describe("getTrackingConfig", () => {
        it("returns valid tracking configuration", () => {
            const config = provider.getTrackingConfig();

            expect(config.openedIntentParserConfig).toBeDefined();
            expect(config.openedIntentParserConfig.type).toBe("custom-event");
            expect(config.fillWatcherConfig).toBeDefined();
            expect(config.fillWatcherConfig.type).toBe("api-based");
        });

        it("configures API-based fill watcher with correct polling interval", () => {
            const config = provider.getTrackingConfig();

            expect(config.fillWatcherConfig.type).toBe("api-based");
            if (config.fillWatcherConfig.type !== "api-based") return;

            expect(config.fillWatcherConfig.pollingInterval).toBe(5000);
            expect(typeof config.fillWatcherConfig.buildEndpoint).toBe("function");
            expect(typeof config.fillWatcherConfig.extractFillEvent).toBe("function");
        });

        it("builds correct status endpoint with requestId", () => {
            const config = provider.getTrackingConfig();

            expect(config.fillWatcherConfig.type).toBe("api-based");
            if (config.fillWatcherConfig.type !== "api-based") return;

            const endpoint = config.fillWatcherConfig.buildEndpoint({
                orderId: "0xrequest123" as `0x${string}`,
                originChainId: CHAIN_IDS.SEPOLIA,
                destinationChainId: CHAIN_IDS.BASE_SEPOLIA,
            });
            expect(endpoint).toBe("/intents/status/v3?requestId=0xrequest123");
        });

        it("maps success status to Finalized with fill event", () => {
            const config = provider.getTrackingConfig();

            expect(config.fillWatcherConfig.type).toBe("api-based");
            if (config.fillWatcherConfig.type !== "api-based") return;

            const result = config.fillWatcherConfig.extractFillEvent(
                {
                    status: "success",
                    txHashes: ["0xfill123"],
                },
                {
                    orderId: "0xrequest123" as `0x${string}`,
                    originChainId: CHAIN_IDS.SEPOLIA,
                    destinationChainId: CHAIN_IDS.BASE_SEPOLIA,
                },
            );
            expect(result.status).toBe(OrderStatus.Finalized);
            expect(result.event).not.toBeNull();
            expect(result.event!.fillTxHash).toBe("0xfill123");
        });

        it("maps failure status to Failed", () => {
            const config = provider.getTrackingConfig();

            expect(config.fillWatcherConfig.type).toBe("api-based");
            if (config.fillWatcherConfig.type !== "api-based") return;

            const result = config.fillWatcherConfig.extractFillEvent(
                { status: "failure" },
                {
                    orderId: "0xrequest123" as `0x${string}`,
                    originChainId: CHAIN_IDS.SEPOLIA,
                    destinationChainId: CHAIN_IDS.BASE_SEPOLIA,
                },
            );
            expect(result.status).toBe(OrderStatus.Failed);
            expect(result.failureReason).toBe(OrderFailureReason.Unknown);
            expect(result.event).toBeNull();
        });

        it("maps refunded status to Refunded", () => {
            const config = provider.getTrackingConfig();

            expect(config.fillWatcherConfig.type).toBe("api-based");
            if (config.fillWatcherConfig.type !== "api-based") return;

            const result = config.fillWatcherConfig.extractFillEvent(
                { status: "refunded" },
                {
                    orderId: "0xrequest123" as `0x${string}`,
                    originChainId: CHAIN_IDS.SEPOLIA,
                    destinationChainId: CHAIN_IDS.BASE_SEPOLIA,
                },
            );
            expect(result.status).toBe(OrderStatus.Refunded);
        });

        it("maps pending/waiting statuses to Pending", () => {
            const config = provider.getTrackingConfig();

            expect(config.fillWatcherConfig.type).toBe("api-based");
            if (config.fillWatcherConfig.type !== "api-based") return;

            for (const status of ["waiting", "pending", "submitted", "delayed"] as const) {
                const result = config.fillWatcherConfig.extractFillEvent(
                    { status },
                    {
                        orderId: "0xrequest123" as `0x${string}`,
                        originChainId: CHAIN_IDS.SEPOLIA,
                        destinationChainId: CHAIN_IDS.BASE_SEPOLIA,
                    },
                );
                expect(result.status).toBe(OrderStatus.Pending);
                expect(result.event).toBeNull();
            }
        });

        it("passes auth headers to fill watcher config", () => {
            const authProvider = new RelayProvider({
                apiUrl: MOCK_API_URL,
                providerId: "auth-mocked",
                apiKey: "test-key",
                source: "test-dapp",
            });

            const config = authProvider.getTrackingConfig();

            expect(config.fillWatcherConfig.type).toBe("api-based");
            if (config.fillWatcherConfig.type !== "api-based") return;

            expect(config.fillWatcherConfig.apiKey).toBe("test-key");
            expect(config.fillWatcherConfig.headers).toEqual({
                Authorization: "Bearer test-key",
                "x-relay-source": "test-dapp",
            });
        });
    });
});
