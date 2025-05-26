import { beforeEach, describe, expect, it, vi } from "vitest";

import { createProviderExecutor, ProviderExecutor } from "../../src/external.js";
import {
    BasicOpenParams,
    CrossChainProvider,
    GetQuoteResponse,
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
    });
});
