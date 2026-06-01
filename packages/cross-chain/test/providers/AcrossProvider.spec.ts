import type viem from "viem";
import { Address, createPublicClient, encodeFunctionData, Hex, pad, PublicClient } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { QuoteRequest } from "../../src/core/schemas/quoteRequest.js";
import { httpRequest } from "../../src/core/utils/httpClient.js";
import { AcrossProvider } from "../../src/external.js";
import {
    ACROSS_SPOKE_POOL_DEPOSIT_ABI,
    AcrossGetQuoteResponse,
    addressToBytes32,
} from "../../src/internal.js";
import { getMockedAcrossApiResponse } from "../mocks/acrossApi.js";
import { CHAIN_IDS, TEST_ADDRESSES, TEST_AMOUNTS, TESTNET_TOKENS } from "../mocks/fixtures.js";

const MOCK_API_URL = "https://mocked.accross.url/api";

const MOCK_MIN_OUTPUT_AMOUNT = 980_000_000_000_000_000n;
const ZERO_BYTES32 = pad("0x00" as Hex, { size: 32 });

interface DepositCalldataOverrides {
    depositor?: Address;
    recipient?: Address;
    inputToken?: Address;
    outputToken?: Address;
    inputAmount?: bigint;
    outputAmount?: bigint;
    destinationChainId?: number;
}

const encodeAcrossDeposit = (overrides: DepositCalldataOverrides = {}): Hex =>
    encodeFunctionData({
        abi: ACROSS_SPOKE_POOL_DEPOSIT_ABI,
        functionName: "deposit",
        args: [
            addressToBytes32(overrides.depositor ?? TEST_ADDRESSES.USER),
            addressToBytes32(overrides.recipient ?? TEST_ADDRESSES.RECEIVER),
            addressToBytes32(overrides.inputToken ?? TESTNET_TOKENS.WETH_SEPOLIA),
            addressToBytes32(overrides.outputToken ?? TESTNET_TOKENS.WETH_BASE_SEPOLIA),
            overrides.inputAmount ?? TEST_AMOUNTS.ONE_ETHER,
            overrides.outputAmount ?? MOCK_MIN_OUTPUT_AMOUNT,
            BigInt(overrides.destinationChainId ?? CHAIN_IDS.BASE_SEPOLIA),
            ZERO_BYTES32,
            0,
            0,
            0,
            "0x",
        ],
    });

const responseWithCalldata = (data: Hex): AcrossGetQuoteResponse => {
    const base = getMockedAcrossApiResponse();
    return { ...base, swapTx: { ...base.swapTx, data } };
};

vi.mock("../../src/core/utils/httpClient.js", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../src/core/utils/httpClient.js")>();
    return {
        ...actual,
        httpRequest: vi.fn(),
    };
});

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
        vi.mocked(httpRequest).mockResolvedValue({
            status: 200,
            data: mockAcrossApiResponse,
            headers: new Headers(),
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

            expect(httpRequest).toHaveBeenCalledWith(`${MOCK_API_URL}/swap/approval`, {
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

        it("exposes minOutputAmount as the slippage floor on preview output", async () => {
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

            const [quote] = await provider.getQuotes(quoteRequest);
            if (!quote) throw new Error("expected a quote");

            // From the mock fixture: expectedOutputAmount=990000…, minOutputAmount=980000…
            expect(quote.preview.outputs[0]?.amount).toBe("990000000000000000");
            expect(quote.preview.outputs[0]?.minAmount).toBe("980000000000000000");
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

            expect(httpRequest).toHaveBeenCalledWith(`${MOCK_API_URL}/swap/approval`, {
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

    describe("calldata amount binding", () => {
        const exactInputRequest: QuoteRequest = {
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

        const exactOutputRequest: QuoteRequest = {
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

        const mockOnce = (data: Hex): void => {
            vi.mocked(httpRequest).mockResolvedValueOnce({
                status: 200,
                data: responseWithCalldata(data),
                headers: new Headers(),
            });
        };

        it("accepts the quote when calldata amounts match the response sibling fields", async () => {
            mockOnce(encodeAcrossDeposit());

            const quotes = await provider.getQuotes(exactInputRequest);

            expect(quotes).toHaveLength(1);
        });

        it("rejects the quote when calldata inputAmount differs from response.inputAmount", async () => {
            mockOnce(encodeAcrossDeposit({ inputAmount: TEST_AMOUNTS.ONE_ETHER * 2n }));

            await expect(provider.getQuotes(exactInputRequest)).rejects.toThrow(
                "Across calldata validation failed",
            );
        });

        it("rejects the quote when calldata outputAmount differs from response.minOutputAmount", async () => {
            mockOnce(encodeAcrossDeposit({ outputAmount: MOCK_MIN_OUTPUT_AMOUNT - 1n }));

            await expect(provider.getQuotes(exactInputRequest)).rejects.toThrow(
                "Across calldata validation failed",
            );
        });

        it("validates the calldata inputAmount against response.inputAmount in exact-output mode", async () => {
            mockOnce(encodeAcrossDeposit({ inputAmount: TEST_AMOUNTS.ONE_ETHER * 2n }));

            await expect(provider.getQuotes(exactOutputRequest)).rejects.toThrow(
                "Across calldata validation failed",
            );
        });

        it("accepts a matching calldata in exact-output mode", async () => {
            mockOnce(encodeAcrossDeposit());

            const quotes = await provider.getQuotes(exactOutputRequest);

            expect(quotes).toHaveLength(1);
        });

        it("rejects cleanly when a response amount is not a valid integer", async () => {
            const base = responseWithCalldata(encodeAcrossDeposit());
            vi.mocked(httpRequest).mockResolvedValueOnce({
                status: 200,
                data: { ...base, inputAmount: "1.5" },
                headers: new Headers(),
            });

            await expect(provider.getQuotes(exactInputRequest)).rejects.toThrow(
                "Across calldata validation failed",
            );
        });
    });

    describe("fallbackToken", () => {
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

        it("is undefined for atomic routes", async () => {
            const [quote] = await provider.getQuotes(quoteRequest);
            expect(quote!.fallbackToken).toBeUndefined();
        });

        it("returns the bridge output token when the route ends in a destination swap", async () => {
            vi.mocked(httpRequest).mockResolvedValueOnce({
                status: 200,
                data: getMockedAcrossApiResponse({
                    crossSwapType: "bridgeableToAny",
                    steps: {
                        bridge: {
                            inputAmount: "1000000000000000000",
                            outputAmount: "999000000000000000",
                            tokenIn: {
                                address: TESTNET_TOKENS.WETH_SEPOLIA,
                                chainId: CHAIN_IDS.SEPOLIA,
                                decimals: 18,
                                symbol: "WETH",
                            },
                            tokenOut: {
                                address: TESTNET_TOKENS.WETH_BASE_SEPOLIA,
                                chainId: CHAIN_IDS.BASE_SEPOLIA,
                                decimals: 18,
                                symbol: "WETH",
                            },
                        },
                    },
                }),
                headers: new Headers(),
            });

            const [quote] = await provider.getQuotes(quoteRequest);
            expect(quote!.fallbackToken).toEqual({
                chainId: CHAIN_IDS.BASE_SEPOLIA,
                accountAddress: TEST_ADDRESSES.RECEIVER,
                assetAddress: TESTNET_TOKENS.WETH_BASE_SEPOLIA,
                amount: "999000000000000000",
            });
        });

        it("returns the intermediate bridge token for bridgeableToBridgeableIndirect routes", async () => {
            const intermediateToken = "0x036cbd53842c5426634e7929541ec2318f3dcf7e"; // USDC on Base Sepolia (lowercase, canonical)

            vi.mocked(httpRequest).mockResolvedValueOnce({
                status: 200,
                data: getMockedAcrossApiResponse({
                    crossSwapType: "bridgeableToBridgeableIndirect",
                    steps: {
                        bridge: {
                            inputAmount: "1000000000000000000",
                            outputAmount: "999000000",
                            tokenIn: {
                                address: TESTNET_TOKENS.WETH_SEPOLIA,
                                chainId: CHAIN_IDS.SEPOLIA,
                                decimals: 18,
                                symbol: "WETH",
                            },
                            tokenOut: {
                                address: intermediateToken,
                                chainId: CHAIN_IDS.BASE_SEPOLIA,
                                decimals: 6,
                                symbol: "USDC",
                            },
                        },
                    },
                }),
                headers: new Headers(),
            });

            const [quote] = await provider.getQuotes(quoteRequest);
            expect(quote!.fallbackToken).toEqual({
                chainId: CHAIN_IDS.BASE_SEPOLIA,
                accountAddress: TEST_ADDRESSES.RECEIVER,
                assetAddress: intermediateToken,
                amount: "999000000",
            });
        });
    });

    describe("getOrderExplorers", () => {
        it("returns the Across tracker URL alongside the chain explorer URLs", () => {
            const explorers = provider.getOrderExplorers({
                originChainId: 8453,
                originTxHash: "0xdeadbeef",
                destinationChainId: 42161,
                destinationTxHash: "0xfeedface",
            });
            expect(explorers.tracker).toBe("https://app.across.to/transaction/0xdeadbeef");
            expect(explorers.origin).toBe("https://basescan.org/tx/0xdeadbeef");
            expect(explorers.destination).toBe("https://arbiscan.io/tx/0xfeedface");
        });

        it("returns an empty object when no tx hash is available", () => {
            const explorers = provider.getOrderExplorers({ originChainId: 1 });
            expect(explorers).toEqual({});
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
