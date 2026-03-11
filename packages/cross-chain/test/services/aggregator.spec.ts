import { GetQuoteRequest } from "@openintentsframework/oif-specs";
import { encodeAddress } from "@wonderland/interop-addresses";
import { Address, Hex } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    AcrossProvider,
    Aggregator,
    createAggregator,
    OrderTracker,
    OrderTrackerFactory,
} from "../../src/external.js";
import {
    CrossChainProvider,
    ExecutableQuote,
    OrderStatus,
    ProviderGetQuoteFailure,
} from "../../src/internal.js";
import { createMockFillEvent } from "../mocks/orderTracking.js";

const USER_ADDRESS = "0x0000000000000000000000000000000000000001" as Address;
const RECEIVER_ADDRESS = "0x0000000000000000000000000000000000000002" as Address;
const INPUT_TOKEN_ADDRESS = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14" as Address;
const OUTPUT_TOKEN_ADDRESS = "0x4200000000000000000000000000000000000006" as Address;
const INPUT_CHAIN_ID = 11155111;
const OUTPUT_CHAIN_ID = 84532;

// Convert to interop addresses using synchronous encodeAddress
const USER_INTEROP_ADDRESS = encodeAddress(
    {
        version: 1,
        chainType: "eip155",
        chainReference: INPUT_CHAIN_ID.toString(),
        address: USER_ADDRESS,
    },
    { format: "hex" },
) as string;

const RECEIVER_INTEROP_ADDRESS = encodeAddress(
    {
        version: 1,
        chainType: "eip155",
        chainReference: OUTPUT_CHAIN_ID.toString(),
        address: RECEIVER_ADDRESS,
    },
    { format: "hex" },
) as string;

const INPUT_TOKEN_INTEROP_ADDRESS = encodeAddress(
    {
        version: 1,
        chainType: "eip155",
        chainReference: INPUT_CHAIN_ID.toString(),
        address: INPUT_TOKEN_ADDRESS,
    },
    { format: "hex" },
) as string;

const OUTPUT_TOKEN_INTEROP_ADDRESS = encodeAddress(
    {
        version: 1,
        chainType: "eip155",
        chainReference: OUTPUT_CHAIN_ID.toString(),
        address: OUTPUT_TOKEN_ADDRESS,
    },
    { format: "hex" },
) as string;

const mockExecutableQuoteA: ExecutableQuote = {
    order: {
        type: "across",
        payload: {
            simulationSuccess: true,
            chainId: INPUT_CHAIN_ID,
            to: "0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5" as Address,
            data: "0x1234567890abcdef",
            gas: "250000",
            maxFeePerGas: "100000000000",
            maxPriorityFeePerGas: "2000000000",
        },
        metadata: {},
    },
    preview: {
        inputs: [{ user: USER_INTEROP_ADDRESS, asset: INPUT_TOKEN_INTEROP_ADDRESS, amount: "100" }],
        outputs: [
            {
                receiver: RECEIVER_INTEROP_ADDRESS,
                asset: OUTPUT_TOKEN_INTEROP_ADDRESS,
                amount: "95",
            },
        ],
    },
    partialFill: false,
    quoteId: "quoteA",
    failureHandling: "refund-automatic",
};

const mockExecutableQuoteB: ExecutableQuote = {
    order: {
        type: "across",
        payload: {
            simulationSuccess: true,
            chainId: INPUT_CHAIN_ID,
            to: "0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5" as Address,
            data: "0xabcdef1234567890",
            gas: "250000",
            maxFeePerGas: "100000000000",
            maxPriorityFeePerGas: "2000000000",
        },
        metadata: {},
    },
    preview: {
        inputs: [{ user: USER_INTEROP_ADDRESS, asset: INPUT_TOKEN_INTEROP_ADDRESS, amount: "100" }],
        outputs: [
            {
                receiver: RECEIVER_INTEROP_ADDRESS,
                asset: OUTPUT_TOKEN_INTEROP_ADDRESS,
                amount: "98",
            },
        ],
    },
    partialFill: false,
    quoteId: "quoteB",
    failureHandling: "refund-automatic",
    preparedTransaction: undefined,
};

const mockProviderA = {
    protocolName: "mockProviderA",
    getProviderId: vi.fn(() => "mockProviderA"),
    getQuotes: vi.fn(() => Promise.resolve([mockExecutableQuoteA])),
} as unknown as CrossChainProvider;

const mockProviderB = {
    protocolName: "mockProviderB",
    getProviderId: vi.fn(() => "mockProviderB"),
    getQuotes: vi.fn(() => Promise.resolve([mockExecutableQuoteB])),
} as unknown as CrossChainProvider;

describe("Aggregator", () => {
    const mockGetQuoteRequest: GetQuoteRequest = {
        user: USER_INTEROP_ADDRESS,
        intent: {
            intentType: "oif-swap",
            inputs: [
                {
                    user: USER_INTEROP_ADDRESS,
                    asset: INPUT_TOKEN_INTEROP_ADDRESS,
                    amount: "100",
                },
            ],
            outputs: [
                {
                    receiver: RECEIVER_INTEROP_ADDRESS,
                    asset: OUTPUT_TOKEN_INTEROP_ADDRESS,
                },
            ],
            swapType: "exact-input",
        },
        supportedTypes: ["across"],
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
            const { quotes } = await aggregator.getQuotes(mockGetQuoteRequest);

            expect(quotes).toHaveLength(2);
        });

        it("return a list of quotes with errors", async () => {
            vi.mocked(mockProviderA.getQuotes).mockRejectedValue(
                new ProviderGetQuoteFailure("Mocked Error A"),
            );
            const aggregator = createAggregator({
                providers: [mockProviderA, mockProviderB],
            });
            const { quotes, errors } = await aggregator.getQuotes(mockGetQuoteRequest);

            expect(quotes).toHaveLength(1);
            expect(errors).toHaveLength(1);
            expect(errors[0]?.errorMsg).toBe("Mocked Error A");
            expect(errors[0]?.error).toBeInstanceOf(Error);
        });

        it("call to getQuotes for each provider", async () => {
            const aggregator = createAggregator({
                providers: [mockProviderA, mockProviderB],
            });
            await aggregator.getQuotes(mockGetQuoteRequest);

            expect(mockProviderA.getQuotes).toHaveBeenCalledWith(mockGetQuoteRequest);
            expect(mockProviderB.getQuotes).toHaveBeenCalledWith(mockGetQuoteRequest);
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

            it("calls notifyDeposit when tracking starts", () => {
                const notifyDeposit = vi.fn().mockResolvedValue(undefined);
                const provider = {
                    ...mockProviderA,
                    getProviderId: vi.fn(() => "notifier"),
                    getTrackingConfig: vi.fn(() => ({
                        openedIntentParserConfig: { type: "api", config: {} },
                        fillWatcherConfig: { type: "api-based", baseUrl: "http://test" },
                    })),
                    notifyDeposit,
                } as unknown as CrossChainProvider;

                const aggregator = createAggregator({
                    providers: [provider],
                });

                aggregator.track({
                    txHash: "0xabc123" as Hex,
                    providerId: "notifier",
                    originChainId: 11155111,
                    destinationChainId: 84532,
                });

                expect(notifyDeposit).toHaveBeenCalledWith("0xabc123", 11155111);
            });

            it("works normally when provider inherits default no-op notifyDeposit", () => {
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
