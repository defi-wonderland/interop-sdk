import type viem from "viem";
import axios from "axios";
import { createPublicClient, PublicClient } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { QuoteRequest } from "../../src/schemas/quoteRequest.js";
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
            const quoteRequest: QuoteRequest = {
                user: TEST_ADDRESSES.USER,
                input: {
                    chainId: CHAIN_IDS.SEPOLIA,
                    assetAddress: TESTNET_TOKENS.WETH_SEPOLIA,
                    amount: TEST_AMOUNTS.ONE_ETHER.toString(),
                },
                output: {
                    chainId: CHAIN_IDS.BASE_SEPOLIA,
                    assetAddress: TESTNET_TOKENS.WETH_BASE_SEPOLIA,
                    recipient: TEST_ADDRESSES.RECEIVER,
                },
                swapType: "exact-input",
            };

            await provider.getQuotes(quoteRequest);

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
            const quoteRequest: QuoteRequest = {
                user: TEST_ADDRESSES.USER,
                input: {
                    chainId: CHAIN_IDS.SEPOLIA,
                    assetAddress: TESTNET_TOKENS.WETH_SEPOLIA,
                },
                output: {
                    chainId: CHAIN_IDS.BASE_SEPOLIA,
                    assetAddress: TESTNET_TOKENS.WETH_BASE_SEPOLIA,
                    amount: TEST_AMOUNTS.ONE_ETHER.toString(),
                    recipient: TEST_ADDRESSES.RECEIVER,
                },
                swapType: "exact-output",
            };

            await provider.getQuotes(quoteRequest);

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
