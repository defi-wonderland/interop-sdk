import axios from "axios";
import { Hex } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { QuoteRequest } from "../../src/core/types/quoteRequest.js";
import {
    OifProvider,
    ProviderExecuteFailure,
    ProviderGetQuoteFailure,
} from "../../src/external.js";
import { OIF_ADDRESSES } from "../mocks/fixtures.js";
import {
    getMockedOifQuoteResponse,
    getMockedOifUserOpenQuoteResponse,
} from "../mocks/oif/index.js";

vi.mock("axios");

const MOCK_SOLVER_URL = "https://mock-solver.example.com";
const MOCK_SOLVER_ID = "mock-solver-1";

describe("OifProvider", () => {
    const provider = new OifProvider({
        solverId: MOCK_SOLVER_ID,
        url: MOCK_SOLVER_URL,
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("constructor", () => {
        it("should create provider with valid config", () => {
            expect(provider.protocolName).toBe("oif");
            expect(provider.providerId).toBe(MOCK_SOLVER_ID);
        });

        it("should throw error for invalid config", () => {
            expect(() => {
                new OifProvider({
                    solverId: "",
                    url: MOCK_SOLVER_URL,
                });
            }).toThrow("Failed to parse OIF provider config");
        });
    });

    describe("getQuotes", () => {
        // SDK-style QuoteRequest
        const mockQuoteRequest: QuoteRequest = {
            user: { chainId: 1, address: OIF_ADDRESSES.USER },
            intent: {
                inputs: [
                    {
                        asset: { chainId: 1, address: OIF_ADDRESSES.TOKEN },
                        amount: "1000000000000000000",
                    },
                ],
                outputs: [
                    {
                        asset: { chainId: 1, address: OIF_ADDRESSES.OUTPUT_ASSET },
                    },
                ],
                swapType: "exact-input",
            },
            supportedLocks: ["oif-escrow"],
        };

        it("should call solver with correct endpoint", async () => {
            vi.mocked(axios.post).mockResolvedValue({
                status: 200,
                data: getMockedOifQuoteResponse(),
            });

            await provider.getQuotes(mockQuoteRequest);

            expect(axios.post).toHaveBeenCalledWith(
                `${MOCK_SOLVER_URL}/v1/quotes`,
                // The provider converts SDK→OIF internally
                expect.objectContaining({
                    intent: expect.objectContaining({
                        intentType: "oif-swap",
                    }),
                    supportedTypes: expect.arrayContaining(["oif-escrow-v0"]),
                }),
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    timeout: 30000,
                },
            );
        });

        it("should return SDK Quote array with valid structure", async () => {
            vi.mocked(axios.post).mockResolvedValue({
                status: 200,
                data: getMockedOifQuoteResponse(),
            });

            const quotes = await provider.getQuotes(mockQuoteRequest);

            expect(quotes).toHaveLength(1);
            expect(quotes[0]).toHaveProperty("order");
            expect(quotes[0]).toHaveProperty("order.steps");
            expect(quotes[0]).toHaveProperty("preview");
            expect(quotes[0]).toHaveProperty("preview.inputs");
            expect(quotes[0]).toHaveProperty("preview.outputs");
            // Verify it's an SDK Quote (has InteropAccountId in preview)
            expect(quotes[0]!.preview.inputs[0]).toHaveProperty("account.chainId");
            expect(quotes[0]!.preview.inputs[0]).toHaveProperty("account.address");
        });

        it("should throw on HTTP error", async () => {
            vi.mocked(axios.post).mockRejectedValue({
                isAxiosError: true,
                message: "Network error",
            });

            await expect(provider.getQuotes(mockQuoteRequest)).rejects.toThrow(
                ProviderGetQuoteFailure,
            );
        });

        it("should throw on invalid response schema", async () => {
            vi.mocked(axios.post).mockResolvedValue({
                status: 200,
                data: { invalid: "response" },
            });

            await expect(provider.getQuotes(mockQuoteRequest)).rejects.toThrow(
                ProviderGetQuoteFailure,
            );
        });

        it("should convert escrow orders to signature steps", async () => {
            vi.mocked(axios.post).mockResolvedValue({
                status: 200,
                data: getMockedOifQuoteResponse(),
            });

            const quotes = await provider.getQuotes(mockQuoteRequest);

            // Escrow orders should become signature steps
            expect(quotes[0]!.order.steps[0]!.kind).toBe("signature");
            expect(quotes[0]!.order.lock).toEqual({ type: "oif-escrow" });
        });

        it("should convert user-open orders to transaction steps", async () => {
            vi.mocked(axios.post).mockResolvedValue({
                status: 200,
                data: getMockedOifUserOpenQuoteResponse(),
            });

            const requestWithUserOpen: QuoteRequest = {
                ...mockQuoteRequest,
                supportedLocks: ["oif-escrow"],
            };

            const quotes = await provider.getQuotes(requestWithUserOpen);

            // User-open orders should become transaction steps
            expect(quotes[0]!.order.steps[0]!.kind).toBe("transaction");
            if (quotes[0]!.order.steps[0]!.kind === "transaction") {
                expect(quotes[0]!.order.steps[0]!.transaction.to).toBeDefined();
                expect(quotes[0]!.order.steps[0]!.transaction.data).toBeDefined();
            }
        });
    });

    describe("submitOrder", () => {
        // Mock EIP-712 signature (130 chars = 0x + 65 bytes in hex)
        const mockSignature = ("0x" + "ab".repeat(65)) as Hex;

        // SDK-style QuoteRequest for getting quotes
        const mockQuoteRequest: QuoteRequest = {
            user: { chainId: 1, address: OIF_ADDRESSES.USER },
            intent: {
                inputs: [
                    {
                        asset: { chainId: 1, address: OIF_ADDRESSES.TOKEN },
                        amount: "1000000000000000000",
                    },
                ],
                outputs: [
                    {
                        asset: { chainId: 1, address: OIF_ADDRESSES.OUTPUT_ASSET },
                    },
                ],
                swapType: "exact-input",
            },
            supportedLocks: ["oif-escrow"],
        };

        // TODO: Unskip when https://github.com/openintentsframework/oif-specs/issues/34 is resolved
        it.skip("should submit order successfully via metadata round-trip", async () => {
            // First get quotes (stashes original OIF data in metadata)
            vi.mocked(axios.post).mockResolvedValueOnce({
                status: 200,
                data: getMockedOifQuoteResponse(),
            });

            const quotes = await provider.getQuotes(mockQuoteRequest);
            const quote = quotes[0]!;

            // Now submit
            vi.mocked(axios.post).mockResolvedValueOnce({
                status: 200,
                data: { orderId: "test-order-id", status: "received", message: "OK" },
            });

            const result = await provider.submitOrder(quote, mockSignature);
            expect(result.orderId).toBe("test-order-id");
            expect(result.status).toBe("received");
        });

        it("should handle HTTP errors during submission", async () => {
            // First get quotes to populate cache
            vi.mocked(axios.post).mockResolvedValueOnce({
                status: 200,
                data: getMockedOifQuoteResponse(),
            });

            const quotes = await provider.getQuotes(mockQuoteRequest);
            const quote = quotes[0]!;

            const axiosError = Object.assign(new Error("Solver rejected order"), {
                isAxiosError: true,
                response: { data: { message: "Solver rejected order" }, status: 400 },
            });

            vi.mocked(axios.post).mockRejectedValue(axiosError);

            await expect(provider.submitOrder(quote, mockSignature)).rejects.toThrow(
                ProviderExecuteFailure,
            );
        });

        it("should include custom headers when submitting", async () => {
            const customProvider = new OifProvider({
                solverId: MOCK_SOLVER_ID,
                url: MOCK_SOLVER_URL,
                headers: { "X-API-Key": "test-key" },
            });

            // First get quotes to populate cache
            vi.mocked(axios.post).mockResolvedValueOnce({
                status: 200,
                data: getMockedOifQuoteResponse(),
            });

            const quotes = await customProvider.getQuotes(mockQuoteRequest);
            const quote = quotes[0]!;

            vi.mocked(axios.post).mockResolvedValueOnce({
                status: 200,
                data: { orderId: "test-order-id", status: "received", message: "OK" },
            });

            await customProvider.submitOrder(quote, mockSignature);

            // The submit call should be the second call (first was getQuotes)
            const submitCall = vi.mocked(axios.post).mock.calls[1];
            expect(submitCall).toBeDefined();
            const [, , config] = submitCall as [
                string,
                unknown,
                { headers: Record<string, string> },
            ];
            expect(config.headers).toBeDefined();
            expect(config.headers["X-API-Key"]).toBe("test-key");
        });
    });
});
