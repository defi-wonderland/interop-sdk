import { PostOrderResponse, PostOrderResponseStatus } from "@openintentsframework/oif-specs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { QuoteRequest } from "../../src/core/schemas/quoteRequest.js";
import { HttpError } from "../../src/core/errors/HttpError.exception.js";
import { HttpNetworkError } from "../../src/core/errors/HttpNetworkError.exception.js";
import { httpRequest } from "../../src/core/utils/httpClient.js";
import {
    OifProvider,
    ProviderExecuteFailure,
    ProviderGetQuoteFailure,
} from "../../src/external.js";
import { OIF_ADDRESSES } from "../mocks/fixtures.js";
import {
    getMockedOifQuoteResponse,
    getMockedOifResourceLockQuoteResponse,
    getMockedOifUserOpenQuoteResponse,
} from "../mocks/oif/index.js";

vi.mock("../../src/core/utils/httpClient.js", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../src/core/utils/httpClient.js")>();
    return {
        ...actual,
        httpRequest: vi.fn(),
    };
});

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
            vi.mocked(httpRequest).mockResolvedValue({
                status: 200,
                data: getMockedOifQuoteResponse(),
                headers: new Headers(),
            });

            await provider.getQuotes(mockQuoteRequest);

            expect(httpRequest).toHaveBeenCalledWith(`${MOCK_SOLVER_URL}/v1/quotes`, {
                method: "POST",
                body: expect.objectContaining({
                    user: expect.any(String),
                    intent: expect.objectContaining({
                        intentType: "oif-swap",
                    }),
                }),
                headers: {
                    "Content-Type": "application/json",
                },
                timeout: 30000,
            });
        });

        it("returns Quote array with valid structure", async () => {
            vi.mocked(httpRequest).mockResolvedValue({
                status: 200,
                data: getMockedOifQuoteResponse(),
                headers: new Headers(),
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
            vi.mocked(httpRequest).mockRejectedValue(
                new HttpNetworkError("Network error", `${MOCK_SOLVER_URL}/v1/quotes`),
            );

            await expect(provider.getQuotes(mockQuoteRequest)).rejects.toThrow(
                ProviderGetQuoteFailure,
            );
        });

        it("throws on invalid response schema", async () => {
            vi.mocked(httpRequest).mockResolvedValue({
                status: 200,
                data: { invalid: "response" },
                headers: new Headers(),
            });

            await expect(provider.getQuotes(mockQuoteRequest)).rejects.toThrow(
                ProviderGetQuoteFailure,
            );
        });

        it("returns signature step for oif-escrow-v0 orders", async () => {
            vi.mocked(httpRequest).mockResolvedValue({
                status: 200,
                data: getMockedOifQuoteResponse(),
                headers: new Headers(),
            });

            const quotes = await provider.getQuotes(mockQuoteRequest);

            // SDK Order with steps — escrow order should produce a signature step
            expect(quotes[0]!.order.steps).toBeDefined();
            expect(quotes[0]!.order.steps.length).toBeGreaterThan(0);
            expect(quotes[0]!.order.steps[0]!.kind).toBe("signature");
        });

        it("returns transaction step for oif-user-open-v0 orders", async () => {
            vi.mocked(httpRequest).mockResolvedValue({
                status: 200,
                data: getMockedOifUserOpenQuoteResponse(),
                headers: new Headers(),
            });

            const quotes = await provider.getQuotes(mockQuoteRequest);

            // SDK Order with steps — user-open order should produce a transaction step
            expect(quotes[0]!.order.steps).toBeDefined();
            expect(quotes[0]!.order.steps.length).toBeGreaterThan(0);
            expect(quotes[0]!.order.steps[0]!.kind).toBe("transaction");
        });

        // TODO (EFI-887): re-enable when resource-lock support lands.
        it("rejects oif-resource-lock-v0 quotes returned by the solver", async () => {
            vi.mocked(httpRequest).mockResolvedValue({
                status: 200,
                data: getMockedOifResourceLockQuoteResponse(),
                headers: new Headers(),
            });

            await expect(provider.getQuotes(mockQuoteRequest)).rejects.toThrow(
                ProviderGetQuoteFailure,
            );
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
            vi.mocked(httpRequest).mockResolvedValueOnce({
                status: 200,
                data: getMockedOifQuoteResponse(),
                headers: new Headers(),
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

            vi.mocked(httpRequest).mockRejectedValue(
                new HttpError(
                    "Request failed with status 400",
                    `${MOCK_SOLVER_URL}/v1/orders`,
                    400,
                    { message: "Solver rejected order" },
                ),
            );

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
            vi.mocked(httpRequest).mockResolvedValueOnce({
                status: 200,
                data: getMockedOifQuoteResponse(),
                headers: new Headers(),
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

            vi.mocked(httpRequest).mockResolvedValueOnce({
                status: 200,
                data: mockPostOrderResponse,
                headers: new Headers(),
            });

            await customProvider.submitOrder(quote, mockSignature);

            // The second call is the submit (first was getQuotes)
            expect(httpRequest).toHaveBeenCalledTimes(2);

            const postCall = vi.mocked(httpRequest).mock.calls[1];
            expect(postCall).toBeDefined();
            const [, options] = postCall as [string, { headers: Record<string, string> }];
            expect(options.headers).toBeDefined();
            expect(options.headers["X-API-Key"]).toBe("test-key");
        });
    });
});
