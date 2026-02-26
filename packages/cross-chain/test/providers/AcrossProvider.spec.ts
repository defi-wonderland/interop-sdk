import type viem from "viem";
import axios from "axios";
import { createPublicClient, PublicClient } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { QuoteRequest } from "../../src/types/quoteRequest.js";
import { AcrossProvider } from "../../src/external.js";
import { getMockedAcrossApiResponse } from "../mocks/acrossApi.js";
import { CHAIN_IDS, TEST_ADDRESSES, TEST_AMOUNTS, TESTNET_TOKENS } from "../mocks/fixtures.js";

const MOCK_API_URL = "https://mocked.accross.url/api";

vi.mock("axios");
vi.mock("viem", async () => {
    return {
        ...(await vi.importActual<typeof viem>("viem")),
        createPublicClient: vi.fn(),
    };
});

describe("AcrossProvider", () => {
    const mockPublicClient = {
        prepareTransactionRequest: vi.fn(),
        readContract: vi.fn(),
    } as unknown as PublicClient;

    const provider = new AcrossProvider({ apiUrl: MOCK_API_URL, providerId: "mocked" });
    const mockAcrossApiResponse = getMockedAcrossApiResponse();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(createPublicClient).mockReturnValue(mockPublicClient);
        vi.mocked(axios.get).mockResolvedValue({
            status: 200,
            data: mockAcrossApiResponse,
        });
    });

    describe("getQuotes", () => {
        it("should call Across API with correct parameters", async () => {
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
                            recipient: {
                                chainId: CHAIN_IDS.BASE_SEPOLIA,
                                address: TEST_ADDRESSES.RECEIVER,
                            },
                        },
                    ],
                    swapType: "exact-input",
                },
            };

            await provider.getQuotes(request);

            expect(axios.get).toHaveBeenCalledWith(`${MOCK_API_URL}/swap/approval`, {
                params: {
                    tradeType: "exactInput",
                    inputToken: TESTNET_TOKENS.WETH_SEPOLIA,
                    outputToken: TESTNET_TOKENS.WETH_BASE_SEPOLIA,
                    amount: TEST_AMOUNTS.ONE_ETHER.toString(),
                    originChainId: CHAIN_IDS.SEPOLIA.toString(),
                    destinationChainId: CHAIN_IDS.BASE_SEPOLIA.toString(),
                    depositor: TEST_ADDRESSES.USER,
                    recipient: TEST_ADDRESSES.RECEIVER,
                },
            });
        });

        it("should handle exact-output swap type", async () => {
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

            expect(axios.get).toHaveBeenCalledWith(`${MOCK_API_URL}/swap/approval`, {
                params: {
                    tradeType: "exactOutput",
                    inputToken: TESTNET_TOKENS.WETH_SEPOLIA,
                    outputToken: TESTNET_TOKENS.WETH_BASE_SEPOLIA,
                    amount: TEST_AMOUNTS.ONE_ETHER.toString(),
                    originChainId: CHAIN_IDS.SEPOLIA.toString(),
                    destinationChainId: CHAIN_IDS.BASE_SEPOLIA.toString(),
                    depositor: TEST_ADDRESSES.USER,
                    recipient: TEST_ADDRESSES.RECEIVER,
                },
            });
        });

        it("should return SDK Quote with transaction step", async () => {
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
                            recipient: {
                                chainId: CHAIN_IDS.BASE_SEPOLIA,
                                address: TEST_ADDRESSES.RECEIVER,
                            },
                        },
                    ],
                    swapType: "exact-input",
                },
            };

            const quotes = await provider.getQuotes(request);

            expect(quotes).toHaveLength(1);
            const quote = quotes[0]!;

            // Should have a transaction step
            expect(quote.order.steps).toHaveLength(1);
            expect(quote.order.steps[0]!.kind).toBe("transaction");

            // Preview should have InteropAccountId format
            expect(quote.preview.inputs[0]!.account).toHaveProperty("chainId");
            expect(quote.preview.inputs[0]!.account).toHaveProperty("address");
            expect(quote.preview.outputs[0]!.account).toHaveProperty("chainId");
            expect(quote.preview.outputs[0]!.account).toHaveProperty("address");

            // Should have quote metadata
            expect(quote.provider).toBe("mocked");
            expect(quote.failureHandling).toBe("refund-automatic");
            expect(quote.partialFill).toBe(false);
        });
    });

    describe("getTrackingConfig", () => {
        it("should return valid tracking configuration for all components", () => {
            const config = provider.getTrackingConfig();

            // openedIntentParserConfig - for V3FundsDeposited event (custom-event type)
            expect(config.openedIntentParserConfig).toBeDefined();
            expect(config.openedIntentParserConfig.type).toBe("custom-event");
            if (config.openedIntentParserConfig.type === "custom-event") {
                expect(config.openedIntentParserConfig.config.protocolName).toBe("across");
                expect(config.openedIntentParserConfig.config.eventSignature).toBeDefined();
                expect(typeof config.openedIntentParserConfig.config.extractOpenedIntent).toBe(
                    "function",
                );
            }

            // fillWatcherConfig - for API-based tracking
            expect(config.fillWatcherConfig).toBeDefined();
            expect(config.fillWatcherConfig.type).toBe("api-based");
            if (config.fillWatcherConfig.type === "api-based") {
                expect(config.fillWatcherConfig.baseUrl).toBeDefined();
                expect(typeof config.fillWatcherConfig.buildEndpoint).toBe("function");
                expect(typeof config.fillWatcherConfig.extractFillEvent).toBe("function");
            }
        });
    });
});
