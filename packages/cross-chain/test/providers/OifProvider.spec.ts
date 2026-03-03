import { PostOrderResponse, PostOrderResponseStatus } from "@openintentsframework/oif-specs";
import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { QuoteRequest } from "../../src/schemas/quoteRequest.js";
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
        it("creates provider with valid config", () => {
            expect(provider.protocolName).toBe("oif");
            expect(provider.providerId).toBe(MOCK_SOLVER_ID);
        });

        it("throws error for invalid config", () => {
            expect(() => {
                new OifProvider({
                    solverId: "",
                    url: MOCK_SOLVER_URL,
                });
            }).toThrow("Failed to parse OIF provider config");
        });
    });

    describe("getQuotes", () => {
        const mockQuoteRequest: QuoteRequest = {
            user: OIF_ADDRESSES.USER,
            input: {
                chainId: 1,
                assetAddress: OIF_ADDRESSES.TOKEN,
                amount: "1000000000000000000",
            },
            output: {
                chainId: 1,
                assetAddress: OIF_ADDRESSES.OUTPUT_ASSET,
            },
            swapType: "exact-input",
        };

        it("calls solver with correct endpoint", async () => {
            vi.mocked(axios.post).mockResolvedValue({
                status: 200,
                data: getMockedOifQuoteResponse(),
            });

            await provider.getQuotes(mockQuoteRequest);

            expect(axios.post).toHaveBeenCalledWith(
                `${MOCK_SOLVER_URL}/v1/quotes`,
                expect.objectContaining({
                    user: expect.any(String),
                    intent: expect.objectContaining({
                        intentType: "oif-swap",
                    }),
                }),
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    timeout: 30000,
                },
            );
        });

        it("returns Quote array with valid structure", async () => {
            vi.mocked(axios.post).mockResolvedValue({
                status: 200,
                data: getMockedOifQuoteResponse(),
            });

            const quotes = await provider.getQuotes(mockQuoteRequest);

            expect(quotes).toHaveLength(1);
            expect(quotes[0]).toHaveProperty("order");
            expect(quotes[0]).toHaveProperty("preview");
            expect(quotes[0]).toHaveProperty("provider");
            // SDK Quote should have order.steps
            expect(quotes[0]!.order).toHaveProperty("steps");
        });

        it("throws on HTTP error", async () => {
            vi.mocked(axios.post).mockRejectedValue({
                isAxiosError: true,
                message: "Network error",
            });

            await expect(provider.getQuotes(mockQuoteRequest)).rejects.toThrow(
                ProviderGetQuoteFailure,
            );
        });

        it("throws on invalid response schema", async () => {
            vi.mocked(axios.post).mockResolvedValue({
                status: 200,
                data: { invalid: "response" },
            });

            await expect(provider.getQuotes(mockQuoteRequest)).rejects.toThrow(
                ProviderGetQuoteFailure,
            );
        });

        it("returns signature step for oif-escrow-v0 orders", async () => {
            vi.mocked(axios.post).mockResolvedValue({
                status: 200,
                data: getMockedOifQuoteResponse(),
            });

            const quotes = await provider.getQuotes(mockQuoteRequest);

            // SDK Order with steps — escrow order should produce a signature step
            expect(quotes[0]!.order.steps).toBeDefined();
            expect(quotes[0]!.order.steps.length).toBeGreaterThan(0);
            expect(quotes[0]!.order.steps[0]!.kind).toBe("signature");
        });

        it("returns transaction step for oif-user-open-v0 orders", async () => {
            vi.mocked(axios.post).mockResolvedValue({
                status: 200,
                data: getMockedOifUserOpenQuoteResponse(),
            });

            const quotes = await provider.getQuotes(mockQuoteRequest);

            // SDK Order with steps — user-open order should produce a transaction step
            expect(quotes[0]!.order.steps).toBeDefined();
            expect(quotes[0]!.order.steps.length).toBeGreaterThan(0);
            expect(quotes[0]!.order.steps[0]!.kind).toBe("transaction");
        });
    });

    describe("submitOrder", () => {
        const mockPostOrderResponse: PostOrderResponse = {
            orderId: "test-order-id-456",
            status: PostOrderResponseStatus.Received,
            message: "Order received",
        };

        // Mock EIP-712 signature (130 chars = 0x + 65 bytes in hex)
        const mockSignature = ("0x" + "ab".repeat(65)) as `0x${string}`;

        it("handles HTTP errors during submission", async () => {
            // First get a real quote to pass to submitOrder
            vi.mocked(axios.post).mockResolvedValueOnce({
                status: 200,
                data: getMockedOifQuoteResponse(),
            });
            const quotes = await provider.getQuotes({
                user: OIF_ADDRESSES.USER,
                input: {
                    chainId: 1,
                    assetAddress: OIF_ADDRESSES.TOKEN,
                    amount: "1000000000000000000",
                },
                output: {
                    chainId: 1,
                    assetAddress: OIF_ADDRESSES.OUTPUT_ASSET,
                },
            });
            const quote = quotes[0]!;

            const axiosError = Object.assign(new Error("Solver rejected order"), {
                isAxiosError: true,
                response: { data: { message: "Solver rejected order" } },
            });

            vi.mocked(axios.post).mockRejectedValue(axiosError);

            await expect(provider.submitOrder(quote, mockSignature)).rejects.toThrow(
                ProviderExecuteFailure,
            );
        });

        it("includes custom headers when submitting", async () => {
            const customProvider = new OifProvider({
                solverId: MOCK_SOLVER_ID,
                url: MOCK_SOLVER_URL,
                headers: { "X-API-Key": "test-key" },
            });

            // First get a real quote
            vi.mocked(axios.post).mockResolvedValueOnce({
                status: 200,
                data: getMockedOifQuoteResponse(),
            });
            const quotes = await customProvider.getQuotes({
                user: OIF_ADDRESSES.USER,
                input: {
                    chainId: 1,
                    assetAddress: OIF_ADDRESSES.TOKEN,
                    amount: "1000000000000000000",
                },
                output: {
                    chainId: 1,
                    assetAddress: OIF_ADDRESSES.OUTPUT_ASSET,
                },
            });
            const quote = quotes[0]!;

            vi.mocked(axios.post).mockResolvedValueOnce({
                status: 200,
                data: mockPostOrderResponse,
            });

            await customProvider.submitOrder(quote, mockSignature);

            // The second call is the submit (first was getQuotes)
            expect(axios.post).toHaveBeenCalledTimes(2);

            const postCall = vi.mocked(axios.post).mock.calls[1];
            expect(postCall).toBeDefined();
            const [, , config] = postCall as [string, unknown, { headers: Record<string, string> }];
            expect(config.headers).toBeDefined();
            expect(config.headers["X-API-Key"]).toBe("test-key");
        });
    });
});
