import type { AxiosInstance } from "axios";
import { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
    RelayIndexTransactionRequest,
    RelayQuoteRequest,
    RelayQuoteResponse,
} from "../../../src/protocols/relay/schemas.js";
import { ProviderGetQuoteFailure } from "../../../src/core/errors/ProviderGetQuoteFailure.exception.js";
import { ProviderGetStatusFailure } from "../../../src/core/errors/ProviderGetStatusFailure.exception.js";
import { RelayApiService } from "../../../src/protocols/relay/services/RelayApiService.js";

// ── Constants ────────────────────────────────────────────

const VALID_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const ORIGIN_CHAIN_ID = 1;
const DESTINATION_CHAIN_ID = 10;
const INPUT_AMOUNT = "1000000";
const OUTPUT_AMOUNT = "999000";
const TX_DATA = "0xdeadbeef";
const REQUEST_ID = "0xreq123";
const ORDER_ID = "0xorder456";
const TIME_ESTIMATE_SECONDS = 30;
const STEP_DESCRIPTION = "Approve and send";
const TX_HASH = "0xdeposithash";

// ── Helpers ──────────────────────────────────────────────

function makeAxiosError(message: string, code?: string): AxiosError {
    return new AxiosError(message, code);
}

function makeQuoteRequest(): RelayQuoteRequest {
    return {
        user: VALID_ADDRESS,
        originChainId: ORIGIN_CHAIN_ID,
        destinationChainId: DESTINATION_CHAIN_ID,
        originCurrency: VALID_ADDRESS,
        destinationCurrency: VALID_ADDRESS,
        amount: INPUT_AMOUNT,
        tradeType: "EXACT_INPUT" as const,
    };
}

function makeQuoteResponse(): RelayQuoteResponse {
    return {
        steps: [
            {
                id: "deposit",
                action: "Confirm transaction",
                description: STEP_DESCRIPTION,
                kind: "transaction",
                requestId: REQUEST_ID,
                items: [
                    {
                        status: "incomplete",
                        data: {
                            to: VALID_ADDRESS,
                            data: TX_DATA,
                            value: INPUT_AMOUNT,
                            chainId: ORIGIN_CHAIN_ID,
                        },
                    },
                ],
            },
        ],
        details: {
            operation: "bridge",
            timeEstimate: TIME_ESTIMATE_SECONDS,
            currencyIn: {
                currency: {
                    chainId: ORIGIN_CHAIN_ID,
                    address: VALID_ADDRESS,
                    symbol: "USDC",
                    name: "USD Coin",
                    decimals: 6,
                },
                amount: INPUT_AMOUNT,
            },
            currencyOut: {
                currency: {
                    chainId: DESTINATION_CHAIN_ID,
                    address: VALID_ADDRESS,
                    symbol: "USDC",
                    name: "USD Coin",
                    decimals: 6,
                },
                amount: OUTPUT_AMOUNT,
            },
        },
        protocol: { v2: { orderId: ORDER_ID } },
    };
}

function makeStatusResponse(): { status: string; txHashes: string[] } {
    return { status: "success", txHashes: [TX_HASH] };
}

function makeIndexTransactionRequest(): RelayIndexTransactionRequest {
    return { chainId: "1", txHash: TX_HASH };
}

// ── Tests ────────────────────────────────────────────────

describe("RelayApiService", () => {
    let service: RelayApiService;
    let mockPost: ReturnType<typeof vi.fn>;
    let mockGet: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPost = vi.fn();
        mockGet = vi.fn();
        const http = { post: mockPost, get: mockGet } as unknown as AxiosInstance;
        service = new RelayApiService(http);
    });

    describe("getQuote()", () => {
        it("validates request and returns parsed response", async () => {
            mockPost.mockResolvedValue({ data: makeQuoteResponse() });
            const result = await service.getQuote(makeQuoteRequest());
            expect(result.steps).toHaveLength(1);
            expect(mockPost).toHaveBeenCalledWith("/quote/v2", makeQuoteRequest());
        });

        it("rejects invalid request params with ProviderGetQuoteFailure", async () => {
            const invalid = { ...makeQuoteRequest(), amount: "not-a-number" };
            await expect(service.getQuote(invalid)).rejects.toThrow(ProviderGetQuoteFailure);
        });

        it("wraps AxiosError in ProviderGetQuoteFailure", async () => {
            mockPost.mockRejectedValue(makeAxiosError("Network Error", "ERR_NETWORK"));
            await expect(service.getQuote(makeQuoteRequest())).rejects.toThrow(
                ProviderGetQuoteFailure,
            );
        });

        it("wraps ZodError from invalid response in ProviderGetQuoteFailure", async () => {
            mockPost.mockResolvedValue({ data: { steps: "not-an-array" } });
            await expect(service.getQuote(makeQuoteRequest())).rejects.toThrow(
                ProviderGetQuoteFailure,
            );
        });
    });

    describe("getStatus()", () => {
        it("validates request and returns parsed response", async () => {
            mockGet.mockResolvedValue({ data: makeStatusResponse() });
            const result = await service.getStatus({ requestId: REQUEST_ID });
            expect(result.status).toBe("success");
            expect(mockGet).toHaveBeenCalledWith("/intents/status/v3", {
                params: { requestId: REQUEST_ID },
            });
        });

        it("wraps AxiosError in ProviderGetStatusFailure", async () => {
            mockGet.mockRejectedValue(makeAxiosError("Network Error"));
            await expect(service.getStatus({ requestId: REQUEST_ID })).rejects.toThrow(
                ProviderGetStatusFailure,
            );
        });

        it("rejects invalid response with ZodError", async () => {
            mockGet.mockResolvedValue({ data: { status: "invalid-status" } });
            await expect(service.getStatus({ requestId: REQUEST_ID })).rejects.toThrow();
        });
    });

    describe("indexTransaction()", () => {
        it("validates request and returns parsed response", async () => {
            mockPost.mockResolvedValue({ data: { message: "ok" } });
            const result = await service.indexTransaction(makeIndexTransactionRequest());
            expect(result.message).toBe("ok");
            expect(mockPost).toHaveBeenCalledWith(
                "/transactions/index",
                makeIndexTransactionRequest(),
            );
        });

        it("rejects invalid request params with ProviderGetStatusFailure", async () => {
            const invalid = { chainId: 123, txHash: TX_HASH } as unknown as Parameters<
                typeof service.indexTransaction
            >[0];
            await expect(service.indexTransaction(invalid)).rejects.toThrow(
                ProviderGetStatusFailure,
            );
        });

        it("wraps AxiosError in ProviderGetStatusFailure", async () => {
            mockPost.mockRejectedValue(makeAxiosError("Network Error"));
            await expect(service.indexTransaction(makeIndexTransactionRequest())).rejects.toThrow(
                ProviderGetStatusFailure,
            );
        });

        it("wraps ZodError from invalid response in ProviderGetStatusFailure", async () => {
            mockPost.mockResolvedValue({ data: { unexpected: true } });
            await expect(service.indexTransaction(makeIndexTransactionRequest())).rejects.toThrow(
                ProviderGetStatusFailure,
            );
        });
    });
});
