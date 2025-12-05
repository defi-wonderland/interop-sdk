import { GetQuoteRequest } from "@openintentsframework/oif-specs";
import { buildFromPayload } from "@wonderland/interop-addresses";
import { Address } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createProviderExecutor, ProviderExecutor } from "../../src/external.js";
import {
    CrossChainProvider,
    ExecutableQuote,
    ProviderGetQuoteFailure,
} from "../../src/internal.js";

// Common addresses for testing
const USER_ADDRESS = "0x0000000000000000000000000000000000000001" as Address;
const RECEIVER_ADDRESS = "0x0000000000000000000000000000000000000002" as Address;
const INPUT_TOKEN_ADDRESS = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14" as Address;
const OUTPUT_TOKEN_ADDRESS = "0x4200000000000000000000000000000000000006" as Address;
const INPUT_CHAIN_ID = 11155111;
const OUTPUT_CHAIN_ID = 84532;

const USER_INTEROP_ADDRESS = buildFromPayload({
    version: 1,
    chainType: "eip155",
    chainReference: `0x${INPUT_CHAIN_ID.toString(16).padStart(6, "0")}`,
    address: USER_ADDRESS,
});

const RECEIVER_INTEROP_ADDRESS = buildFromPayload({
    version: 1,
    chainType: "eip155",
    chainReference: `0x${OUTPUT_CHAIN_ID.toString(16).padStart(6, "0")}`,
    address: RECEIVER_ADDRESS,
});

const INPUT_TOKEN_INTEROP_ADDRESS = buildFromPayload({
    version: 1,
    chainType: "eip155",
    chainReference: `0x${INPUT_CHAIN_ID.toString(16).padStart(6, "0")}`,
    address: INPUT_TOKEN_ADDRESS,
});

const OUTPUT_TOKEN_INTEROP_ADDRESS = buildFromPayload({
    version: 1,
    chainType: "eip155",
    chainReference: `0x${OUTPUT_CHAIN_ID.toString(16).padStart(6, "0")}`,
    address: OUTPUT_TOKEN_ADDRESS,
});

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

describe("ProviderExecutor", () => {
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

    describe("createProviderExecutor", () => {
        it("create a provider executor", () => {
            const providerExecutor = createProviderExecutor({
                providers: [mockProviderA, mockProviderB],
            });
            expect(providerExecutor).toBeDefined();
            expect(providerExecutor).toBeInstanceOf(ProviderExecutor);
        });

        it("contains the providers in the executor", () => {
            const providerExecutor = createProviderExecutor({
                providers: [mockProviderA, mockProviderB],
            });
            expect(
                (
                    providerExecutor as unknown as {
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
            const providerExecutor = createProviderExecutor({
                providers: [mockProviderA, mockProviderB],
            });
            const { quotes } = await providerExecutor.getQuotes(mockGetQuoteRequest);

            expect(quotes).toHaveLength(2);
        });

        it("return a list of quotes with errors", async () => {
            vi.mocked(mockProviderA.getQuotes).mockRejectedValue(
                new ProviderGetQuoteFailure("Mocked Error A"),
            );
            const providerExecutor = createProviderExecutor({
                providers: [mockProviderA, mockProviderB],
            });
            const { quotes, errors } = await providerExecutor.getQuotes(mockGetQuoteRequest);

            expect(quotes).toHaveLength(1);
            expect(errors).toHaveLength(1);
            expect(errors[0]?.errorMsg).toBe("Mocked Error A");
            expect(errors[0]?.error).toBeInstanceOf(Error);
        });

        it("call to getQuotes for each provider", async () => {
            const providerExecutor = createProviderExecutor({
                providers: [mockProviderA, mockProviderB],
            });
            await providerExecutor.getQuotes(mockGetQuoteRequest);

            expect(mockProviderA.getQuotes).toHaveBeenCalledWith(mockGetQuoteRequest);
            expect(mockProviderB.getQuotes).toHaveBeenCalledWith(mockGetQuoteRequest);
        });
    });
});
