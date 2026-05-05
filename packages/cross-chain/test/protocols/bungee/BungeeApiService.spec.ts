import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
    BungeeQuoteRequest,
    BungeeQuoteResponse,
    BungeeStatusRequest,
    BungeeStatusResponse,
    BungeeSubmitRequest,
    BungeeSubmitResponse,
} from "../../../src/protocols/bungee/schemas.js";
import { HttpNetworkError } from "../../../src/core/errors/HttpNetworkError.exception.js";
import { ProviderExecuteFailure } from "../../../src/core/errors/ProviderExecuteFailure.exception.js";
import { ProviderGetQuoteFailure } from "../../../src/core/errors/ProviderGetQuoteFailure.exception.js";
import { ProviderGetStatusFailure } from "../../../src/core/errors/ProviderGetStatusFailure.exception.js";
import { HttpClient } from "../../../src/core/utils/httpClient.js";
import { BungeeApiService } from "../../../src/protocols/bungee/services/BungeeApiService.js";

// ── Constants ────────────────────────────────────────────

const VALID_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const ORIGIN_CHAIN_ID = 1;
const DESTINATION_CHAIN_ID = 10;
const INPUT_AMOUNT = "1000000";
const OUTPUT_AMOUNT = "999000";

// ── Helpers ──────────────────────────────────────────────

function makeHttpError(message: string): HttpNetworkError {
    return new HttpNetworkError(message, "https://test/url");
}

function mockOk(data: unknown): { status: number; data: unknown; headers: Headers } {
    return { status: 200, data, headers: new Headers() };
}

function makeQuoteRequest(): BungeeQuoteRequest {
    return {
        userAddress: VALID_ADDRESS,
        originChainId: String(ORIGIN_CHAIN_ID),
        destinationChainId: String(DESTINATION_CHAIN_ID),
        inputToken: VALID_ADDRESS,
        inputAmount: INPUT_AMOUNT,
        receiverAddress: VALID_ADDRESS,
        outputToken: VALID_ADDRESS,
    };
}

function makeQuoteResponse(): BungeeQuoteResponse {
    return {
        success: true,
        statusCode: 200,
        result: {
            originChainId: ORIGIN_CHAIN_ID,
            destinationChainId: DESTINATION_CHAIN_ID,
            userAddress: VALID_ADDRESS,
            receiverAddress: VALID_ADDRESS,
            input: {
                token: {
                    chainId: ORIGIN_CHAIN_ID,
                    address: VALID_ADDRESS,
                    name: "ETH",
                    symbol: "ETH",
                    decimals: 18,
                },
                amount: INPUT_AMOUNT,
                priceInUsd: 1,
                valueInUsd: 1,
            },
            autoRoute: {
                userOp: "sign",
                requestHash: "0xreqhash",
                output: {
                    token: {
                        chainId: DESTINATION_CHAIN_ID,
                        address: VALID_ADDRESS,
                        name: "USDC",
                        symbol: "USDC",
                        decimals: 6,
                    },
                    amount: OUTPUT_AMOUNT,
                    priceInUsd: 1,
                    valueInUsd: 0.999,
                    minAmountOut: "998000",
                    effectiveReceivedInUsd: 0.998,
                },
                requestType: "SINGLE_OUTPUT_REQUEST",
                signTypedData: {
                    domain: { name: "Permit2" },
                    types: {},
                    values: { witness: { field: "value" } },
                },
                gasFee: {
                    gasToken: {
                        chainId: ORIGIN_CHAIN_ID,
                        address: "0x0000000000000000000000000000000000000000",
                        name: "ETH",
                        symbol: "ETH",
                        decimals: 18,
                    },
                    gasLimit: "21000",
                    gasPrice: "20000000000",
                    estimatedFee: "420000000000000",
                    feeInUsd: 0.5,
                },
                slippage: 0.5,
                estimatedTime: 30,
                routeDetails: {
                    name: "across",
                    logoURI: "https://example.com/logo.png",
                },
                quoteId: "quote-123",
                quoteExpiry: 1700000000,
                routeTags: ["MAX_OUTPUT"],
            },
            manualRoutes: [],
        },
    };
}

function makeSubmitRequest(): BungeeSubmitRequest {
    return {
        request: { witness: { field: "value" } },
        userSignature: "0xsignature",
        requestType: "SINGLE_OUTPUT_REQUEST",
        quoteId: "quote-123",
    };
}

function makeSubmitResponse(): BungeeSubmitResponse {
    return {
        success: true,
        statusCode: 200,
        result: { hash: "0xhash" },
    };
}

function makeStatusRequest(): BungeeStatusRequest {
    return {
        requestHash: "0xreqhash",
    };
}

function makeStatusResponse(): BungeeStatusResponse {
    return {
        success: true,
        statusCode: 200,
        result: [
            {
                hash: "0xreqhash",
                originData: {
                    input: [
                        {
                            token: {
                                chainId: ORIGIN_CHAIN_ID,
                                address: VALID_ADDRESS,
                                name: "ETH",
                                symbol: "ETH",
                                decimals: 18,
                            },
                            amount: INPUT_AMOUNT,
                            priceInUsd: 1,
                            valueInUsd: 1,
                        },
                    ],
                    originChainId: ORIGIN_CHAIN_ID,
                    txHash: "0xtxhash",
                    status: "COMPLETED",
                    userAddress: VALID_ADDRESS,
                },
                destinationData: {
                    output: [
                        {
                            token: {
                                chainId: DESTINATION_CHAIN_ID,
                                address: VALID_ADDRESS,
                                name: "USDC",
                                symbol: "USDC",
                                decimals: 6,
                            },
                            amount: OUTPUT_AMOUNT,
                            priceInUsd: 1,
                            valueInUsd: 0.999,
                            minAmountOut: "998000",
                        },
                    ],
                    txHash: "0xdesttxhash",
                    destinationChainId: DESTINATION_CHAIN_ID,
                    receiverAddress: VALID_ADDRESS,
                    status: "COMPLETED",
                },
                routeDetails: {
                    name: "across",
                    logoURI: "https://example.com/logo.png",
                },
                bungeeStatusCode: 0,
            },
        ],
    };
}

// ── Tests ────────────────────────────────────────────────

describe("BungeeApiService", () => {
    let service: BungeeApiService;
    let mockPost: ReturnType<typeof vi.fn>;
    let mockGet: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPost = vi.fn();
        mockGet = vi.fn();
        const http = { post: mockPost, get: mockGet } as unknown as HttpClient;
        service = new BungeeApiService(http);
    });

    describe("getQuote()", () => {
        it("calls GET /api/v1/bungee/quote with params", async () => {
            mockGet.mockResolvedValue(mockOk(makeQuoteResponse()));
            const result = await service.getQuote(makeQuoteRequest());
            expect(result.success).toBe(true);
            expect(result.result.originChainId).toBe(ORIGIN_CHAIN_ID);
            expect(mockGet).toHaveBeenCalledWith("/api/v1/bungee/quote", {
                params: makeQuoteRequest(),
            });
        });

        it("rejects invalid request params with ProviderGetQuoteFailure", async () => {
            const invalid = { ...makeQuoteRequest(), originChainId: 123 as unknown as string };
            await expect(service.getQuote(invalid)).rejects.toThrow(ProviderGetQuoteFailure);
        });

        it("wraps AxiosError in ProviderGetQuoteFailure", async () => {
            mockGet.mockRejectedValue(makeHttpError("Network Error"));
            await expect(service.getQuote(makeQuoteRequest())).rejects.toThrow(
                ProviderGetQuoteFailure,
            );
        });

        it("wraps ZodError from invalid response in ProviderGetQuoteFailure", async () => {
            mockGet.mockResolvedValue(mockOk({ success: "not-a-boolean" }));
            await expect(service.getQuote(makeQuoteRequest())).rejects.toThrow(
                ProviderGetQuoteFailure,
            );
        });
    });

    describe("submitOrder()", () => {
        it("calls POST /api/v1/bungee/submit with body", async () => {
            mockPost.mockResolvedValue(mockOk(makeSubmitResponse()));
            const result = await service.submitOrder(makeSubmitRequest());
            expect(result.success).toBe(true);
            expect(mockPost).toHaveBeenCalledWith("/api/v1/bungee/submit", makeSubmitRequest());
        });

        it("rejects invalid request params with ProviderExecuteFailure", async () => {
            const invalid = { ...makeSubmitRequest(), quoteId: 123 as unknown as string };
            await expect(service.submitOrder(invalid)).rejects.toThrow(ProviderExecuteFailure);
        });

        it("wraps AxiosError in ProviderExecuteFailure", async () => {
            mockPost.mockRejectedValue(makeHttpError("Network Error"));
            await expect(service.submitOrder(makeSubmitRequest())).rejects.toThrow(
                ProviderExecuteFailure,
            );
        });

        it("wraps ZodError from invalid response in ProviderExecuteFailure", async () => {
            mockPost.mockResolvedValue(mockOk({ success: "not-a-boolean" }));
            await expect(service.submitOrder(makeSubmitRequest())).rejects.toThrow(
                ProviderExecuteFailure,
            );
        });
    });

    describe("getStatus()", () => {
        it("calls GET /api/v1/bungee/status with params", async () => {
            mockGet.mockResolvedValue(mockOk(makeStatusResponse()));
            const result = await service.getStatus(makeStatusRequest());
            expect(result.success).toBe(true);
            expect(result.result).toHaveLength(1);
            expect(mockGet).toHaveBeenCalledWith("/api/v1/bungee/status", {
                params: makeStatusRequest(),
            });
        });

        it("wraps AxiosError in ProviderGetStatusFailure", async () => {
            mockGet.mockRejectedValue(makeHttpError("Network Error"));
            await expect(service.getStatus(makeStatusRequest())).rejects.toThrow(
                ProviderGetStatusFailure,
            );
        });

        it("wraps ZodError from invalid response in ProviderGetStatusFailure", async () => {
            mockGet.mockResolvedValue(mockOk({ success: "not-a-boolean" }));
            await expect(service.getStatus(makeStatusRequest())).rejects.toThrow(
                ProviderGetStatusFailure,
            );
        });
    });
});
