import type viem from "viem";
import { getQuote } from "@across-protocol/app-sdk";
import {
    createPublicClient,
    encodeAbiParameters,
    encodeFunctionData,
    erc20Abi,
    Hex,
    PublicClient,
} from "viem";
import { sepolia } from "viem/chains";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    ACROSS_OIF_ADAPTER_CONTRACT_ADDRESSES,
    ACROSS_OPEN_GAS_LIMIT,
    ACROSS_ORDER_DATA_ABI,
    ACROSS_ORDER_DATA_TYPE,
} from "../../src/constants/across.js";
import { AcrossProvider } from "../../src/external.js";
import { OPEN_ABI } from "../../src/internal.js";
import { formatTokenAmount, getTokenAllowance, parseTokenAmount } from "../../src/utils/token.js";
import { getMockedQuote } from "../mocks/across.js";

vi.mock("@across-protocol/app-sdk");
vi.mock("viem", async () => {
    return {
        ...(await vi.importActual<typeof viem>("viem")),
        encodeAbiParameters: vi.fn(),
        encodeFunctionData: vi.fn(),
        createPublicClient: vi.fn(),
    };
});

vi.mock("../../src/utils/token.js", async () => {
    return {
        getTokenAllowance: vi.fn(),
        getTokenDecimals: vi.fn(),
        formatTokenAmount: vi.fn(),
        parseTokenAmount: vi.fn(),
    };
});

describe("AcrossProvider", () => {
    const mockPublicClient = {
        prepareTransactionRequest: vi.fn(),
        readContract: vi.fn(),
    } as unknown as PublicClient;

    const provider = new AcrossProvider();

    const mockedFormattedAmount = "1";
    const mockedParsedAmount = BigInt(1);
    const mockEncodeAbiParameters = vi.mocked(encodeAbiParameters);
    const mockGetQuote = vi.mocked(getQuote);
    const mockQuote = getMockedQuote();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(formatTokenAmount).mockResolvedValue(mockedFormattedAmount);
        vi.mocked(parseTokenAmount).mockResolvedValue(mockedParsedAmount);
        vi.mocked(createPublicClient).mockReturnValue(mockPublicClient);
        mockEncodeAbiParameters.mockResolvedValue("0x0000000000000000000000000000000000000000");
        mockGetQuote.mockResolvedValue(mockQuote);
    });

    describe("getQuote", () => {
        it("call to getQuote with the correct parameters", async () => {
            await provider.getQuote("crossChainTransfer", {
                inputAmount: "1",
                inputTokenAddress: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
                outputTokenAddress: "0x4200000000000000000000000000000000000006",
                inputChainId: 11155111,
                outputChainId: 84532,
                sender: "0x0000000000000000000000000000000000000000",
                recipient: "0x0000000000000000000000000000000000000000",
            });

            expect(mockGetQuote).toHaveBeenCalledWith({
                inputAmount: 1n,
                route: {
                    originChainId: 11155111,
                    destinationChainId: 84532,
                    inputToken: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
                    outputToken: "0x4200000000000000000000000000000000000006",
                },
                apiUrl: expect.any(String) as string,
                recipient: "0x0000000000000000000000000000000000000000",
            });
        });

        it("call to encodeAbiParameters with the correct parameters", async () => {
            await provider.getQuote("crossChainTransfer", {
                inputAmount: "1",
                inputTokenAddress: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
                outputTokenAddress: "0x4200000000000000000000000000000000000006",
                inputChainId: 11155111,
                outputChainId: 84532,
                sender: "0x0000000000000000000000000000000000000000",
                recipient: "0x0000000000000000000000000000000000000000",
            });

            expect(mockEncodeAbiParameters).toHaveBeenCalledWith(ACROSS_ORDER_DATA_ABI, [
                {
                    inputToken: mockQuote.deposit.inputToken,
                    inputAmount: mockQuote.deposit.inputAmount,
                    outputToken: mockQuote.deposit.outputToken,
                    destinationChainId: mockQuote.deposit.destinationChainId,
                    outputAmount: mockQuote.deposit.outputAmount,
                    recipient: "0x0000000000000000000000000000000000000000",
                    exclusiveRelayer: mockQuote.deposit.exclusiveRelayer,
                    exclusivityPeriod: mockQuote.deposit.exclusivityDeadline,
                    depositNonce: 0,
                    message: "0x",
                },
            ]);
        });

        it("return fees correctly", async () => {
            const mockQuote = getMockedQuote({
                fees: {
                    lpFee: {
                        pct: BigInt(1),
                        total: BigInt(1),
                    },
                    relayerGasFee: {
                        pct: BigInt(2),
                        total: BigInt(2),
                    },
                    relayerCapitalFee: {
                        pct: BigInt(3),
                        total: BigInt(3),
                    },
                    totalRelayFee: {
                        pct: BigInt(4000000000000000),
                        total: BigInt(4),
                    },
                },
            });

            mockGetQuote.mockResolvedValue(mockQuote);

            const quote = await provider.getQuote("crossChainTransfer", {
                inputAmount: "1",
                inputTokenAddress: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
                outputTokenAddress: "0x4200000000000000000000000000000000000006",
                inputChainId: 11155111,
                outputChainId: 84532,
                sender: "0x0000000000000000000000000000000000000000",
                recipient: "0x0000000000000000000000000000000000000000",
            });

            expect(formatTokenAmount).toHaveBeenCalledWith(
                {
                    amount: BigInt(4),
                    tokenAddress: "0x0000000000000000000000000000000000000000",
                    chain: sepolia,
                },
                { publicClient: mockPublicClient },
            );

            expect(quote.fee).toEqual({
                total: mockedFormattedAmount,
                percent: "4",
            });
        });

        it("return quote correctly", async () => {
            const quote = await provider.getQuote("crossChainTransfer", {
                inputAmount: "1",
                inputTokenAddress: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
                outputTokenAddress: "0x4200000000000000000000000000000000000006",
                inputChainId: 11155111,
                outputChainId: 84532,
                sender: "0x0000000000000000000000000000000000000000",
                recipient: "0x0000000000000000000000000000000000000000",
            });

            expect(quote).toEqual({
                protocol: "across",
                action: "crossChainTransfer",
                isAmountTooLow: false,
                output: {
                    inputTokenAddress: mockQuote.deposit.inputToken,
                    outputTokenAddress: mockQuote.deposit.outputToken,
                    inputAmount: mockedFormattedAmount,
                    outputAmount: mockedFormattedAmount,
                    inputChainId: mockQuote.deposit.originChainId,
                    outputChainId: mockQuote.deposit.destinationChainId,
                },
                openParams: {
                    action: "crossChainTransfer",
                    params: {
                        inputChainId: mockQuote.deposit.originChainId,
                        outputChainId: mockQuote.deposit.destinationChainId,
                        inputTokenAddress: mockQuote.deposit.inputToken,
                        outputTokenAddress: mockQuote.deposit.outputToken,
                        inputAmount: mockQuote.deposit.inputAmount,
                        fillDeadline: mockQuote.deposit.fillDeadline,
                        orderDataType: ACROSS_ORDER_DATA_TYPE,
                        orderData: expect.any(String) as string,
                        sender: "0x0000000000000000000000000000000000000000",
                        recipient: "0x0000000000000000000000000000000000000000",
                    },
                },
                fee: {
                    total: "1",
                    percent: "0.000000000000001",
                },
            });
        });
    });

    describe("simulateOpen", () => {
        const openParams = {
            action: "crossChainTransfer" as const,
            params: {
                inputChainId: 11155111,
                outputChainId: 84532,
                inputTokenAddress: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14" as Hex,
                outputTokenAddress: "0x4200000000000000000000000000000000000006" as Hex,
                inputAmount: BigInt(1),
                fillDeadline: 1,
                orderDataType: ACROSS_ORDER_DATA_TYPE,
                orderData: "0x" as Hex,
                sender: "0x0000000000000000000000000000000000000000",
                recipient: "0x0000000000000000000000000000000000000000",
            },
        } as const;

        it("prepare transaction request with the correct parameters", async () => {
            vi.mocked(encodeFunctionData).mockReturnValue(
                "0x0000000000000000000000000000000000000000",
            );

            await provider.simulateOpen(openParams);

            expect(encodeFunctionData).toHaveBeenCalledWith({
                abi: OPEN_ABI,
                functionName: "open",
                args: [
                    {
                        fillDeadline: openParams.params.fillDeadline,
                        orderDataType: openParams.params.orderDataType,
                        orderData: openParams.params.orderData,
                    },
                ],
            });
            expect(mockPublicClient.prepareTransactionRequest).toHaveBeenCalledWith({
                account: "0x0000000000000000000000000000000000000000",
                to: ACROSS_OIF_ADAPTER_CONTRACT_ADDRESSES[11155111],
                data: "0x0000000000000000000000000000000000000000",
                chain: sepolia,
                gas: ACROSS_OPEN_GAS_LIMIT,
            });
        });

        it("call to getTokenAllowance with the correct parameters", async () => {
            await provider.simulateOpen(openParams);

            expect(getTokenAllowance).toHaveBeenCalledWith(
                {
                    tokenAddress: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
                    chain: sepolia,
                    spender: ACROSS_OIF_ADAPTER_CONTRACT_ADDRESSES[11155111],
                    owner: "0x0000000000000000000000000000000000000000",
                },
                { publicClient: mockPublicClient },
            );
        });

        it("call to prepareTransaction with allowance transaction if allowance is not enough", async () => {
            vi.mocked(getTokenAllowance).mockResolvedValue(BigInt(0));
            vi.mocked(encodeFunctionData).mockReturnValue(
                "0x0000000000000000000000000000000000000000",
            );

            await provider.simulateOpen(openParams);

            expect(encodeFunctionData).toHaveBeenCalledWith({
                abi: erc20Abi,
                functionName: "approve",
                args: [ACROSS_OIF_ADAPTER_CONTRACT_ADDRESSES[11155111]!, BigInt(1)],
            });

            expect(mockPublicClient.prepareTransactionRequest).toHaveBeenCalledWith({
                account: "0x0000000000000000000000000000000000000000",
                to: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
                data: "0x0000000000000000000000000000000000000000",
                chain: sepolia,
            });
        });

        it("don't call prepareTransaction if allowance is enough", async () => {
            vi.mocked(getTokenAllowance).mockResolvedValue(BigInt(10));
            vi.mocked(encodeFunctionData).mockReturnValue(
                "0x0000000000000000000000000000000000000000",
            );

            await provider.simulateOpen(openParams);

            expect(mockPublicClient.prepareTransactionRequest).toHaveBeenCalledTimes(1);
        });
    });
});
