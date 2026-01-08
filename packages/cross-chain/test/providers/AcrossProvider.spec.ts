import type viem from "viem";
import { encodeAddress } from "@wonderland/interop-addresses";
import axios from "axios";
import { Address, createPublicClient, PublicClient } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AcrossProvider } from "../../src/external.js";
import { getMockedAcrossApiResponse } from "../mocks/acrossApi.js";

const MOCK_API_URL = "https://mocked.accross.url/api";

// Common addresses for testing
const COMMON_USER_ADDRESS = "0x0000000000000000000000000000000000000001" as Address;
const COMMON_RECEIVER_ADDRESS = "0x0000000000000000000000000000000000000002" as Address;
const INPUT_TOKEN_ADDRESS = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14" as Address;
const OUTPUT_TOKEN_ADDRESS = "0x4200000000000000000000000000000000000006" as Address;
const INPUT_CHAIN_ID = 11155111; // Sepolia
const OUTPUT_CHAIN_ID = 84532; // Base Sepolia

// Convert to interop addresses using synchronous encodeAddress
const USER_INTEROP_ADDRESS = encodeAddress(
    {
        version: 1,
        chainType: "eip155",
        chainReference: INPUT_CHAIN_ID.toString(),
        address: COMMON_USER_ADDRESS,
    },
    { format: "hex" },
) as string;

const RECEIVER_INTEROP_ADDRESS = encodeAddress(
    {
        version: 1,
        chainType: "eip155",
        chainReference: OUTPUT_CHAIN_ID.toString(),
        address: COMMON_RECEIVER_ADDRESS,
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
                            amount: "1000000000000000000",
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
                    inputToken: INPUT_TOKEN_ADDRESS,
                    outputToken: OUTPUT_TOKEN_ADDRESS,
                    amount: "1000000000000000000",
                    originChainId: INPUT_CHAIN_ID.toString(),
                    destinationChainId: OUTPUT_CHAIN_ID.toString(),
                    depositor: COMMON_USER_ADDRESS,
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
                            amount: "1000000000000000000",
                        },
                    ],
                    swapType: "exact-output",
                },
                supportedTypes: ["across"],
            });

            expect(axios.get).toHaveBeenCalledWith(`${MOCK_API_URL}/swap/approval`, {
                params: {
                    tradeType: "exactOutput",
                    inputToken: INPUT_TOKEN_ADDRESS,
                    outputToken: OUTPUT_TOKEN_ADDRESS,
                    amount: "1000000000000000000",
                    originChainId: INPUT_CHAIN_ID.toString(),
                    destinationChainId: OUTPUT_CHAIN_ID.toString(),
                    depositor: COMMON_USER_ADDRESS,
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
