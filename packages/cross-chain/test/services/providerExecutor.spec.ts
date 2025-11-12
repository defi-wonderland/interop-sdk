import type { Hex } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    AcrossProvider,
    createProviderExecutor,
    ExecuteResult,
    IntentTracker,
    ProviderExecutor,
} from "../../src/external.js";
import {
    BasicOpenParams,
    CrossChainProvider,
    GetQuoteParams,
    GetQuoteResponse,
    ParamsParser,
    ValidActions,
} from "../../src/internal.js";

const mockProviderA = {
    getProtocolName: vi.fn(() => "mockProviderA"),
    getQuote: vi.fn(() => Promise.resolve({} as GetQuoteResponse<ValidActions, BasicOpenParams>)),
    simulateOpen: vi.fn(() => Promise.resolve([])),
} as unknown as CrossChainProvider<BasicOpenParams>;

const mockProviderB = {
    getProtocolName: vi.fn(() => "mockProviderB"),
    getQuote: vi.fn(() => Promise.resolve({} as GetQuoteResponse<ValidActions, BasicOpenParams>)),
    simulateOpen: vi.fn(() => Promise.resolve([])),
} as unknown as CrossChainProvider<BasicOpenParams>;

const mockParamParser = {
    parseGetQuoteParams: vi.fn(() =>
        Promise.resolve({
            inputTokenAddress: "0x123",
            outputTokenAddress: "0x456",
            inputAmount: "100",
            inputChainId: 11155111,
            outputChainId: 84532,
            sender: "0x123",
            recipient: "0x456",
        } as GetQuoteParams<ValidActions>),
    ),
} as unknown as ParamsParser<{
    inputTokenAddress: string;
    outputTokenAddress: string;
    inputAmount: string;
    inputChainId: number;
    outputChainId: number;
}>;

describe("ProviderExecutor", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("createProviderExecutor", () => {
        it("create a provider executor", () => {
            const providerExecutor = createProviderExecutor([mockProviderA, mockProviderB]);
            expect(providerExecutor).toBeDefined();
            expect(providerExecutor).toBeInstanceOf(ProviderExecutor);
        });

        it("contains the providers in the executor", () => {
            const providerExecutor = createProviderExecutor([mockProviderA, mockProviderB]);
            expect(
                (
                    providerExecutor as unknown as {
                        providers: CrossChainProvider<BasicOpenParams>[];
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
            const providerExecutor = createProviderExecutor([mockProviderA, mockProviderB]);
            const quotes = await providerExecutor.getQuotes("crossChainTransfer", {
                inputTokenAddress: "0x123",
                outputTokenAddress: "0x456",
                inputAmount: "100",
                inputChainId: 11155111,
                outputChainId: 84532,
            });

            expect(quotes).toHaveLength(2);
        });

        it("return a list of quotes with errors", async () => {
            vi.mocked(mockProviderA.getQuote).mockRejectedValue(new Error("Mocked Error A"));
            const providerExecutor = createProviderExecutor([mockProviderA, mockProviderB]);
            const quotes = await providerExecutor.getQuotes("crossChainTransfer", {
                inputTokenAddress: "0x123",
                outputTokenAddress: "0x456",
                inputAmount: "100",
                inputChainId: 11155111,
                outputChainId: 84532,
            });

            expect(quotes).toHaveLength(2);
            expect(quotes).toEqual(
                expect.arrayContaining([
                    {
                        errorMsg: "Mocked Error A",
                        error: new Error("Mocked Error A"),
                    },
                ]),
            );
        });

        it("call to getQuote for each provider", async () => {
            const providerExecutor = createProviderExecutor([mockProviderA, mockProviderB]);
            await providerExecutor.getQuotes("crossChainTransfer", {
                inputTokenAddress: "0x123",
                outputTokenAddress: "0x456",
                inputAmount: "100",
                inputChainId: 11155111,
                outputChainId: 84532,
            });

            expect(mockProviderA.getQuote).toHaveBeenCalledWith("crossChainTransfer", {
                inputTokenAddress: "0x123",
                outputTokenAddress: "0x456",
                inputAmount: "100",
                inputChainId: 11155111,
                outputChainId: 84532,
            });
            expect(mockProviderB.getQuote).toHaveBeenCalledWith("crossChainTransfer", {
                inputTokenAddress: "0x123",
                outputTokenAddress: "0x456",
                inputAmount: "100",
                inputChainId: 11155111,
                outputChainId: 84532,
            });
        });

        describe("with a param parser", () => {
            it("call to parser with origin params", async () => {
                const providerExecutor = createProviderExecutor([mockProviderA, mockProviderB], {
                    paramParser: mockParamParser,
                });
                await providerExecutor.getQuotes("crossChainTransfer", {
                    inputTokenAddress: "0x123",
                    outputTokenAddress: "0x456",
                    inputAmount: "100",
                    inputChainId: 11155111,
                    outputChainId: 84532,
                });

                expect(mockParamParser.parseGetQuoteParams).toHaveBeenCalledWith(
                    "crossChainTransfer",
                    {
                        inputTokenAddress: "0x123",
                        outputTokenAddress: "0x456",
                        inputAmount: "100",
                        inputChainId: 11155111,
                        outputChainId: 84532,
                    },
                );
            });

            it("call to providers with parsed params", async () => {
                const providerExecutor = createProviderExecutor([mockProviderA, mockProviderB], {
                    paramParser: mockParamParser,
                });
                await providerExecutor.getQuotes("crossChainTransfer", {
                    inputTokenAddress: "0x123",
                    outputTokenAddress: "0x456",
                    inputAmount: "100",
                    inputChainId: 11155111,
                    outputChainId: 84532,
                });

                expect(mockProviderA.getQuote).toHaveBeenCalledWith("crossChainTransfer", {
                    inputTokenAddress: "0x123",
                    outputTokenAddress: "0x456",
                    inputAmount: "100",
                    inputChainId: 11155111,
                    outputChainId: 84532,
                    sender: "0x123",
                    recipient: "0x456",
                });

                expect(mockProviderB.getQuote).toHaveBeenCalledWith("crossChainTransfer", {
                    inputTokenAddress: "0x123",
                    outputTokenAddress: "0x456",
                    inputAmount: "100",
                    inputChainId: 11155111,
                    outputChainId: 84532,
                    sender: "0x123",
                    recipient: "0x456",
                });
            });
        });
    });

    describe("execute", () => {
        it("execute the quote at the right provider", async () => {
            const providerExecutor = createProviderExecutor([mockProviderA, mockProviderB]);
            await providerExecutor.execute({
                protocol: "mockProviderA",
                action: "crossChainTransfer",
                output: {},
                openParams: {
                    action: "crossChainTransfer",
                    params: { test: "test" },
                },
                fee: {
                    total: "100",
                    percent: "100",
                },
            } as unknown as GetQuoteResponse<ValidActions, BasicOpenParams>);

            expect(mockProviderA.simulateOpen).toHaveBeenCalledWith({
                action: "crossChainTransfer",
                params: { test: "test" },
            });

            expect(mockProviderB.simulateOpen).not.toHaveBeenCalled();

            vi.clearAllMocks();

            await providerExecutor.execute({
                protocol: "mockProviderB",
                action: "crossChainTransfer",
                output: {},
                openParams: {
                    action: "crossChainTransfer",
                    params: { test: "test" },
                },
                fee: { total: "100", percent: "100" },
            } as unknown as GetQuoteResponse<ValidActions, BasicOpenParams>);

            expect(mockProviderA.simulateOpen).not.toHaveBeenCalled();
            expect(mockProviderB.simulateOpen).toHaveBeenCalledWith({
                action: "crossChainTransfer",
                params: { test: "test" },
            });
        });

        it("returns ExecuteResult with chain IDs", async () => {
            const providerExecutor = createProviderExecutor([mockProviderA]);
            const result = await providerExecutor.execute({
                protocol: "mockProviderA",
                action: "crossChainTransfer",
                output: {},
                openParams: {
                    action: "crossChainTransfer",
                    params: {
                        inputChainId: 11155111,
                        outputChainId: 84532,
                    },
                },
                fee: { total: "100", percent: "100" },
            } as unknown as GetQuoteResponse<ValidActions, BasicOpenParams>);

            expect(result).toHaveProperty("transactions");
            expect(result).toHaveProperty("protocol", "mockProviderA");
            expect(result).toHaveProperty("originChainId", 11155111);
            expect(result).toHaveProperty("destinationChainId", 84532);
        });
    });

    describe("tracking", () => {
        describe("prepareTracking", () => {
            it("returns an IntentTracker instance", () => {
                const providerExecutor = createProviderExecutor([new AcrossProvider()]);
                const executeResult: ExecuteResult = {
                    transactions: [],
                    protocol: "across",
                    originChainId: 11155111,
                    destinationChainId: 84532,
                };

                const tracker = providerExecutor.prepareTracking(executeResult);

                expect(tracker).toBeInstanceOf(IntentTracker);
            });

            it("caches tracker instances per protocol", () => {
                const providerExecutor = createProviderExecutor([new AcrossProvider()]);
                const executeResult: ExecuteResult = {
                    transactions: [],
                    protocol: "across",
                    originChainId: 11155111,
                    destinationChainId: 84532,
                };

                const tracker1 = providerExecutor.prepareTracking(executeResult);
                const tracker2 = providerExecutor.prepareTracking(executeResult);

                expect(tracker1).toBe(tracker2);
            });
        });

        describe("track", () => {
            it("returns an IntentTracker instance", () => {
                const providerExecutor = createProviderExecutor([new AcrossProvider()]);

                const tracker = providerExecutor.track({
                    txHash: "0xabc123" as Hex,
                    protocol: "across",
                    originChainId: 11155111,
                    destinationChainId: 84532,
                });

                expect(tracker).toBeInstanceOf(IntentTracker);
            });

            it("uses cached tracker for same protocol", () => {
                const providerExecutor = createProviderExecutor([new AcrossProvider()]);

                const tracker1 = providerExecutor.track({
                    txHash: "0xabc123" as Hex,
                    protocol: "across",
                    originChainId: 11155111,
                    destinationChainId: 84532,
                });

                const tracker2 = providerExecutor.track({
                    txHash: "0xdef456" as Hex,
                    protocol: "across",
                    originChainId: 11155111,
                    destinationChainId: 84532,
                });

                expect(tracker1).toBe(tracker2);
            });

            it("throws error for unsupported protocol", () => {
                const providerExecutor = createProviderExecutor([new AcrossProvider()]);

                expect(() => {
                    providerExecutor.track({
                        txHash: "0xabc123" as Hex,
                        protocol: "unsupported",
                        originChainId: 11155111,
                        destinationChainId: 84532,
                    });
                }).toThrow();
            });
        });

        describe("with custom RPC URLs", () => {
            it("creates executor with custom RPC URLs", () => {
                const customRpcUrls = {
                    11155111: "https://custom-sepolia.com",
                    84532: "https://custom-base.com",
                };

                const providerExecutor = createProviderExecutor([new AcrossProvider()], {
                    rpcUrls: customRpcUrls,
                });

                expect(providerExecutor).toBeDefined();
            });
        });
    });
});
