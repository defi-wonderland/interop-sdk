import { Address, Hex } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
    ExecutableQuote,
    Quote,
    StepResult,
    SubmitOrderResponse,
} from "../../src/core/types/quote.js";
import type { QuoteRequest } from "../../src/core/types/quoteRequest.js";
import {
    AcrossProvider,
    Aggregator,
    createAggregator,
    OrderTracker,
    OrderTrackerFactory,
} from "../../src/external.js";
import {
    CrossChainProvider,
    OrderStatus,
    ProviderGetQuoteFailure,
    ProviderNotFound,
} from "../../src/internal.js";
import { createMockFillEvent } from "../mocks/orderTracking.js";

const USER_ADDRESS = "0x0000000000000000000000000000000000000001" as Address;
const RECEIVER_ADDRESS = "0x0000000000000000000000000000000000000002" as Address;
const INPUT_TOKEN_ADDRESS = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14" as Address;
const OUTPUT_TOKEN_ADDRESS = "0x4200000000000000000000000000000000000006" as Address;
const INPUT_CHAIN_ID = 11155111;
const OUTPUT_CHAIN_ID = 84532;

// Mock SDK Quotes — these are what providers return now
const mockSdkQuoteA: Quote = {
    order: {
        steps: [
            {
                kind: "transaction",
                chainId: INPUT_CHAIN_ID,
                transaction: {
                    to: "0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5",
                    data: "0x1234567890abcdef",
                    gas: "250000",
                    maxFeePerGas: "100000000000",
                    maxPriorityFeePerGas: "2000000000",
                },
            },
        ],
        metadata: { simulationSuccess: true },
    },
    preview: {
        inputs: [
            {
                account: { chainId: INPUT_CHAIN_ID, address: USER_ADDRESS },
                asset: { chainId: INPUT_CHAIN_ID, address: INPUT_TOKEN_ADDRESS },
                amount: "100",
            },
        ],
        outputs: [
            {
                account: { chainId: OUTPUT_CHAIN_ID, address: RECEIVER_ADDRESS },
                asset: { chainId: OUTPUT_CHAIN_ID, address: OUTPUT_TOKEN_ADDRESS },
                amount: "95",
            },
        ],
    },
    provider: "mockProviderA",
    partialFill: false,
    quoteId: "quoteA",
    failureHandling: "refund-automatic",
};

const mockSdkQuoteB: Quote = {
    order: {
        steps: [
            {
                kind: "transaction",
                chainId: INPUT_CHAIN_ID,
                transaction: {
                    to: "0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5",
                    data: "0xabcdef1234567890",
                    gas: "250000",
                    maxFeePerGas: "100000000000",
                    maxPriorityFeePerGas: "2000000000",
                },
            },
        ],
        metadata: { simulationSuccess: true },
    },
    preview: {
        inputs: [
            {
                account: { chainId: INPUT_CHAIN_ID, address: USER_ADDRESS },
                asset: { chainId: INPUT_CHAIN_ID, address: INPUT_TOKEN_ADDRESS },
                amount: "100",
            },
        ],
        outputs: [
            {
                account: { chainId: OUTPUT_CHAIN_ID, address: RECEIVER_ADDRESS },
                asset: { chainId: OUTPUT_CHAIN_ID, address: OUTPUT_TOKEN_ADDRESS },
                amount: "98",
            },
        ],
    },
    provider: "mockProviderB",
    partialFill: false,
    quoteId: "quoteB",
    failureHandling: "refund-automatic",
};

const mockSubmitResponse: SubmitOrderResponse = {
    orderId: "0xorder123" as Hex,
    status: "received",
};

const mockProviderA = {
    protocolName: "mockProviderA",
    getProviderId: vi.fn(() => "mockProviderA"),
    getQuotes: vi.fn(() => Promise.resolve([mockSdkQuoteA])),
    submitOrder: vi.fn(() => Promise.resolve(mockSubmitResponse)),
} as unknown as CrossChainProvider;

const mockProviderB = {
    protocolName: "mockProviderB",
    getProviderId: vi.fn(() => "mockProviderB"),
    getQuotes: vi.fn(() => Promise.resolve([mockSdkQuoteB])),
    submitOrder: vi.fn(() => Promise.resolve({ orderId: "0xorder456" as Hex, status: "received" })),
} as unknown as CrossChainProvider;

describe("Aggregator", () => {
    // New SDK-style quote request
    const mockQuoteRequest: QuoteRequest = {
        user: USER_ADDRESS,
        input: { asset: { chainId: INPUT_CHAIN_ID, address: INPUT_TOKEN_ADDRESS }, amount: "100" },
        output: {
            asset: { chainId: OUTPUT_CHAIN_ID, address: OUTPUT_TOKEN_ADDRESS },
            recipient: RECEIVER_ADDRESS,
        },
        swapType: "exact-input",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("createAggregator", () => {
        it("create a provider executor", () => {
            const aggregator = createAggregator({
                providers: [mockProviderA, mockProviderB],
            });
            expect(aggregator).toBeDefined();
            expect(aggregator).toBeInstanceOf(Aggregator);
        });

        it("contains the providers in the executor", () => {
            const aggregator = createAggregator({
                providers: [mockProviderA, mockProviderB],
            });
            expect(
                (
                    aggregator as unknown as {
                        providers: Record<string, CrossChainProvider>;
                    }
                ).providers,
            ).toEqual({
                mockProviderA: mockProviderA,
                mockProviderB: mockProviderB,
            });
        });
    });

    describe("getQuotes", () => {
        it("return a list of quotes", async () => {
            const aggregator = createAggregator({
                providers: [mockProviderA, mockProviderB],
            });
            const { quotes } = await aggregator.getQuotes(mockQuoteRequest);

            expect(quotes).toHaveLength(2);
        });

        it("return a list of quotes with errors", async () => {
            vi.mocked(mockProviderA.getQuotes).mockRejectedValueOnce(
                new ProviderGetQuoteFailure("Mocked Error A"),
            );
            const aggregator = createAggregator({
                providers: [mockProviderA, mockProviderB],
            });
            const { quotes, errors } = await aggregator.getQuotes(mockQuoteRequest);

            expect(quotes).toHaveLength(1);
            expect(errors).toHaveLength(1);
            expect(errors[0]?.errorMsg).toBe("Mocked Error A");
            expect(errors[0]?.error).toBeInstanceOf(Error);
        });

        it("passes SDK QuoteRequest directly to providers", async () => {
            const aggregator = createAggregator({
                providers: [mockProviderA, mockProviderB],
            });
            await aggregator.getQuotes(mockQuoteRequest);

            // Providers receive SDK QuoteRequest directly
            expect(mockProviderA.getQuotes).toHaveBeenCalledTimes(1);
            expect(mockProviderB.getQuotes).toHaveBeenCalledTimes(1);

            // Verify the SDK request is passed directly with new flat shape
            const request = vi.mocked(mockProviderA.getQuotes).mock.calls[0]![0];
            expect(request).toHaveProperty("input.asset");
            expect(request).toHaveProperty("user", USER_ADDRESS);
        });

        it("wraps provider quotes as ExecutableQuotes with _providerId", async () => {
            const aggregator = createAggregator({
                providers: [mockProviderA],
            });
            const { quotes } = await aggregator.getQuotes(mockQuoteRequest);

            expect(quotes).toHaveLength(1);
            expect(quotes[0]!._providerId).toBe("mockProviderA");
            expect(quotes[0]!.order).toEqual(mockSdkQuoteA.order);
            expect(quotes[0]!.preview).toEqual(mockSdkQuoteA.preview);
        });
    });

    describe("submitOrder", () => {
        const mockSignatureQuote: ExecutableQuote = {
            order: {
                steps: [
                    {
                        kind: "signature",
                        chainId: INPUT_CHAIN_ID,
                        signaturePayload: {
                            signatureType: "eip712",
                            domain: { name: "Permit2", chainId: INPUT_CHAIN_ID },
                            primaryType: "PermitBatchWitnessTransferFrom",
                            types: {},
                            message: {},
                        },
                    },
                ],
                lock: { type: "oif-escrow" },
            },
            preview: {
                inputs: [
                    {
                        account: { chainId: INPUT_CHAIN_ID, address: USER_ADDRESS },
                        asset: { chainId: INPUT_CHAIN_ID, address: INPUT_TOKEN_ADDRESS },
                        amount: "100",
                    },
                ],
                outputs: [
                    {
                        account: { chainId: OUTPUT_CHAIN_ID, address: RECEIVER_ADDRESS },
                        asset: { chainId: OUTPUT_CHAIN_ID, address: OUTPUT_TOKEN_ADDRESS },
                        amount: "95",
                    },
                ],
            },
            provider: "mockProviderA",
            _providerId: "mockProviderA",
        };

        it("submits a raw Hex signature to the provider", async () => {
            const executor = createAggregator({ providers: [mockProviderA] });
            const signature = "0xdeadbeef" as Hex;

            await executor.submitOrder(mockSignatureQuote, signature);

            expect(mockProviderA.submitOrder).toHaveBeenCalledOnce();
            expect(mockProviderA.submitOrder).toHaveBeenCalledWith(mockSignatureQuote, signature);
        });

        it("extracts signature from StepResult[]", async () => {
            const executor = createAggregator({ providers: [mockProviderA] });
            const stepResults: StepResult[] = [{ stepIndex: 0, signature: "0xcafebabe" as Hex }];

            await executor.submitOrder(mockSignatureQuote, stepResults);

            expect(mockProviderA.submitOrder).toHaveBeenCalledWith(
                mockSignatureQuote,
                "0xcafebabe",
            );
        });

        it("throws when StepResult[] has no signatures", async () => {
            const executor = createAggregator({ providers: [mockProviderA] });
            const emptyResults: StepResult[] = [];

            await expect(executor.submitOrder(mockSignatureQuote, emptyResults)).rejects.toThrow(
                "No signature found in step results",
            );
        });

        it("throws ProviderNotFound for unknown provider", async () => {
            const executor = createAggregator({ providers: [mockProviderA] });
            const unknownQuote: ExecutableQuote = {
                ...mockSignatureQuote,
                _providerId: "nonexistent",
            };

            await expect(executor.submitOrder(unknownQuote, "0xdeadbeef" as Hex)).rejects.toThrow(
                ProviderNotFound,
            );
        });

        it("returns the provider response", async () => {
            const executor = createAggregator({ providers: [mockProviderA] });

            const result = await executor.submitOrder(mockSignatureQuote, "0xdeadbeef" as Hex);

            expect(result).toEqual(mockSubmitResponse);
        });
    });

    describe("tracking", () => {
        const MOCK_API_URL = "https://mocked.across.url/api";
        const MOCK_PROVIDER_ID = "across";

        describe("getOrderStatus", () => {
            it("returns order status for a given transaction", async () => {
                const aggregator = createAggregator({
                    providers: [
                        new AcrossProvider({ apiUrl: MOCK_API_URL, providerId: MOCK_PROVIDER_ID }),
                    ],
                });

                const tracker = aggregator.prepareTracking(MOCK_PROVIDER_ID);
                const getOrderStatusSpy = vi.spyOn(tracker, "getOrderStatus");

                const mockFillEvent = createMockFillEvent({
                    orderId:
                        "0x000000000000000000000000000000000000000000000000000000000000007b" as Hex,
                });

                const mockStatus = {
                    status: OrderStatus.Finalized,
                    orderId:
                        "0x000000000000000000000000000000000000000000000000000000000000007b" as Hex,
                    openTxHash: "0xdef456" as Hex,
                    user: USER_ADDRESS,
                    originChainId: 11155111,
                    destinationChainId: 84532,
                    fillEvent: mockFillEvent,
                };

                getOrderStatusSpy.mockResolvedValue(mockStatus);

                const result = await aggregator.getOrderStatus({
                    txHash: "0xdef456" as Hex,
                    providerId: MOCK_PROVIDER_ID,
                    originChainId: 11155111,
                });

                expect(result).toEqual(mockStatus);
                expect(getOrderStatusSpy).toHaveBeenCalledWith("0xdef456", 11155111);
            });

            it("throws error for unsupported provider", async () => {
                const aggregator = createAggregator({
                    providers: [
                        new AcrossProvider({ apiUrl: MOCK_API_URL, providerId: MOCK_PROVIDER_ID }),
                    ],
                });

                await expect(
                    aggregator.getOrderStatus({
                        txHash: "0xabc123" as Hex,
                        providerId: "unsupported",
                        originChainId: 11155111,
                    }),
                ).rejects.toThrow();
            });

            it("uses cached tracker instance", async () => {
                const aggregator = createAggregator({
                    providers: [
                        new AcrossProvider({ apiUrl: MOCK_API_URL, providerId: MOCK_PROVIDER_ID }),
                    ],
                });

                const tracker1 = aggregator.prepareTracking(MOCK_PROVIDER_ID);
                const getOrderStatusSpy = vi.spyOn(tracker1, "getOrderStatus").mockResolvedValue({
                    status: OrderStatus.Pending,
                    orderId: "0xorder1" as Hex,
                    openTxHash: "0xtx1" as Hex,
                    user: USER_ADDRESS,
                    originChainId: 11155111,
                    openDeadline: 0,
                    fillDeadline: 0,
                    maxSpent: [],
                    minReceived: [],
                    fillInstructions: [],
                });

                await aggregator.getOrderStatus({
                    txHash: "0xtx1" as Hex,
                    providerId: MOCK_PROVIDER_ID,
                    originChainId: 11155111,
                });

                expect(getOrderStatusSpy).toHaveBeenCalled();
            });
        });

        describe("prepareTracking", () => {
            it("returns an OrderTracker instance", () => {
                const aggregator = createAggregator({
                    providers: [
                        new AcrossProvider({ apiUrl: MOCK_API_URL, providerId: MOCK_PROVIDER_ID }),
                    ],
                });

                const tracker = aggregator.prepareTracking(MOCK_PROVIDER_ID);

                expect(tracker).toBeInstanceOf(OrderTracker);
            });

            it("caches tracker instances per provider", () => {
                const aggregator = createAggregator({
                    providers: [
                        new AcrossProvider({ apiUrl: MOCK_API_URL, providerId: MOCK_PROVIDER_ID }),
                    ],
                });

                const tracker1 = aggregator.prepareTracking(MOCK_PROVIDER_ID);
                const tracker2 = aggregator.prepareTracking(MOCK_PROVIDER_ID);

                expect(tracker1).toBe(tracker2);
            });
        });

        describe("track", () => {
            it("returns an OrderTracker instance", () => {
                const aggregator = createAggregator({
                    providers: [
                        new AcrossProvider({ apiUrl: MOCK_API_URL, providerId: MOCK_PROVIDER_ID }),
                    ],
                });

                const tracker = aggregator.track({
                    txHash: "0xabc123" as Hex,
                    providerId: MOCK_PROVIDER_ID,
                    originChainId: 11155111,
                    destinationChainId: 84532,
                });

                expect(tracker).toBeInstanceOf(OrderTracker);
            });

            it("uses cached tracker for same provider", () => {
                const aggregator = createAggregator({
                    providers: [
                        new AcrossProvider({ apiUrl: MOCK_API_URL, providerId: MOCK_PROVIDER_ID }),
                    ],
                });

                const tracker1 = aggregator.track({
                    txHash: "0xabc123" as Hex,
                    providerId: MOCK_PROVIDER_ID,
                    originChainId: 11155111,
                    destinationChainId: 84532,
                });

                const tracker2 = aggregator.track({
                    txHash: "0xdef456" as Hex,
                    providerId: MOCK_PROVIDER_ID,
                    originChainId: 11155111,
                    destinationChainId: 84532,
                });

                expect(tracker1).toBe(tracker2);
            });

            it("throws error for unsupported provider", () => {
                const aggregator = createAggregator({
                    providers: [
                        new AcrossProvider({ apiUrl: MOCK_API_URL, providerId: MOCK_PROVIDER_ID }),
                    ],
                });

                expect(() => {
                    aggregator.track({
                        txHash: "0xabc123" as Hex,
                        providerId: "unsupported",
                        originChainId: 11155111,
                        destinationChainId: 84532,
                    });
                }).toThrow();
            });
        });

        describe("with custom tracker factory", () => {
            it("uses custom factory to create trackers", () => {
                const customFactory = new OrderTrackerFactory({
                    rpcUrls: {
                        11155111: "https://custom-factory-sepolia.com",
                        84532: "https://custom-factory-base.com",
                    },
                });

                const provider = new AcrossProvider({
                    apiUrl: MOCK_API_URL,
                    providerId: MOCK_PROVIDER_ID,
                });
                const createTrackerSpy = vi.spyOn(customFactory, "createTracker");

                const aggregator = createAggregator({
                    providers: [provider],
                    trackerFactory: customFactory,
                });

                const tracker = aggregator.prepareTracking(MOCK_PROVIDER_ID);

                expect(tracker).toBeInstanceOf(OrderTracker);
                expect(createTrackerSpy).toHaveBeenCalledOnce();
                expect(createTrackerSpy).toHaveBeenCalledWith(provider);
            });

            it("calls factory once per provider and caches result", () => {
                const customFactory = new OrderTrackerFactory({
                    rpcUrls: {
                        11155111: "https://custom-sepolia.com",
                        84532: "https://custom-base.com",
                    },
                });

                const createTrackerSpy = vi.spyOn(customFactory, "createTracker");

                const providerA = new AcrossProvider({
                    apiUrl: MOCK_API_URL,
                    providerId: "across-a",
                });
                const providerB = new AcrossProvider({
                    apiUrl: MOCK_API_URL,
                    providerId: "across-b",
                });

                const aggregator = createAggregator({
                    providers: [providerA, providerB],
                    trackerFactory: customFactory,
                });

                const tracker1 = aggregator.prepareTracking("across-a");
                const tracker2 = aggregator.prepareTracking("across-a");
                aggregator.prepareTracking("across-b");

                expect(createTrackerSpy).toHaveBeenCalledTimes(2);
                expect(createTrackerSpy).toHaveBeenCalledWith(providerA);
                expect(createTrackerSpy).toHaveBeenCalledWith(providerB);
                expect(tracker1).toBe(tracker2);
            });
        });
    });
});
