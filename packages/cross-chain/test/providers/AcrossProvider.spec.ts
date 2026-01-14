import type viem from "viem";
import { buildFromPayload } from "@wonderland/interop-addresses";
import axios from "axios";
import { createPublicClient, PublicClient } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AcrossProvider } from "../../src/external.js";
import { getMockedAcrossApiResponse } from "../mocks/acrossApi.js";
import { CHAIN_IDS, TEST_ADDRESSES, TEST_AMOUNTS, TESTNET_TOKENS } from "../mocks/fixtures.js";

const MOCK_API_URL = "https://mocked.accross.url/api";

// Build interop addresses for testnet scenario
const USER_INTEROP_ADDRESS = await buildFromPayload({
    version: 1,
    chainType: "eip155",
    chainReference: `0x${CHAIN_IDS.SEPOLIA.toString(16).padStart(6, "0")}`,
    address: TEST_ADDRESSES.USER,
});
const RECEIVER_INTEROP_ADDRESS = await buildFromPayload({
    version: 1,
    chainType: "eip155",
    chainReference: `0x${CHAIN_IDS.BASE_SEPOLIA.toString(16).padStart(6, "0")}`,
    address: TEST_ADDRESSES.RECEIVER,
});
const INPUT_TOKEN_INTEROP_ADDRESS = await buildFromPayload({
    version: 1,
    chainType: "eip155",
    chainReference: `0x${CHAIN_IDS.SEPOLIA.toString(16).padStart(6, "0")}`,
    address: TESTNET_TOKENS.WETH_SEPOLIA,
});
const OUTPUT_TOKEN_INTEROP_ADDRESS = await buildFromPayload({
    version: 1,
    chainType: "eip155",
    chainReference: `0x${CHAIN_IDS.BASE_SEPOLIA.toString(16).padStart(6, "0")}`,
    address: TESTNET_TOKENS.WETH_BASE_SEPOLIA,
});

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
            await provider.getQuotes({
                user: USER_INTEROP_ADDRESS,
                intent: {
                    intentType: "oif-swap",
                    inputs: [
                        {
                            user: USER_INTEROP_ADDRESS,
                            asset: INPUT_TOKEN_INTEROP_ADDRESS,
                            amount: TEST_AMOUNTS.ONE_ETHER.toString(),
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
            });

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
            await provider.getQuotes({
                user: USER_INTEROP_ADDRESS,
                intent: {
                    intentType: "oif-swap",
                    inputs: [
                        {
                            user: USER_INTEROP_ADDRESS,
                            asset: INPUT_TOKEN_INTEROP_ADDRESS,
                        },
                    ],
                    outputs: [
                        {
                            receiver: RECEIVER_INTEROP_ADDRESS,
                            asset: OUTPUT_TOKEN_INTEROP_ADDRESS,
                            amount: TEST_AMOUNTS.ONE_ETHER.toString(),
                        },
                    ],
                    swapType: "exact-output",
                },
                supportedTypes: ["across"],
            });

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

            // fillWatcherConfig
            expect(config.fillWatcherConfig.contractAddresses).toBeDefined();
            expect(config.fillWatcherConfig.eventAbi).toBeDefined();
            expect(typeof config.fillWatcherConfig.buildLogsArgs).toBe("function");
            expect(typeof config.fillWatcherConfig.extractFillEvent).toBe("function");
        });
    });
});
