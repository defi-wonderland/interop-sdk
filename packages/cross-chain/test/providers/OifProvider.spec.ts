import {
    GetQuoteRequest,
    PostOrderResponse,
    PostOrderResponseStatus,
} from "@openintentsframework/oif-specs";
import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    OifProvider,
    ProviderExecuteFailure,
    ProviderGetQuoteFailure,
} from "../../src/external.js";
import { OIF_INTEROP_ADDRESSES } from "../mocks/fixtures.js";
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
        const mockQuoteRequest: GetQuoteRequest = {
            user: OIF_INTEROP_ADDRESSES.USER,
            intent: {
                intentType: "oif-swap",
                inputs: [
                    {
                        user: OIF_INTEROP_ADDRESSES.USER,
                        asset: OIF_INTEROP_ADDRESSES.TOKEN,
                        amount: "1000000000000000000",
                    },
                ],
                outputs: [
                    {
                        receiver: OIF_INTEROP_ADDRESSES.USER,
                        asset: OIF_INTEROP_ADDRESSES.OUTPUT_ASSET,
                    },
                ],
                swapType: "exact-input",
            },
            supportedTypes: ["oif-escrow-v0"],
        };

        it("should call solver with correct endpoint", async () => {
            vi.mocked(axios.post).mockResolvedValue({
                status: 200,
                data: getMockedOifQuoteResponse(),
            });

            await provider.getQuotes(mockQuoteRequest);

            expect(axios.post).toHaveBeenCalledWith(
                `${MOCK_SOLVER_URL}/v1/quotes`,
                mockQuoteRequest,
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    timeout: 30000,
                },
            );
        });

        it("should return ExecutableQuote array with valid structure", async () => {
            vi.mocked(axios.post).mockResolvedValue({
                status: 200,
                data: getMockedOifQuoteResponse(),
            });

            const quotes = await provider.getQuotes(mockQuoteRequest);

            expect(quotes).toHaveLength(1);
            expect(quotes[0]).toHaveProperty("order");
            expect(quotes[0]).toHaveProperty("preview");
            expect(quotes[0]).toHaveProperty("provider");
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

        it("should not prepare transaction for oif-escrow-v0 orders", async () => {
            vi.mocked(axios.post).mockResolvedValue({
                status: 200,
                data: getMockedOifQuoteResponse(),
            });

            const quotes = await provider.getQuotes(mockQuoteRequest);

            expect(quotes[0]?.preparedTransaction).toBeUndefined();
        });

        it("should prepare transaction for oif-user-open-v0 orders", async () => {
            vi.mocked(axios.post).mockResolvedValue({
                status: 200,
                data: getMockedOifUserOpenQuoteResponse(),
            });

            const requestWithUserOpen: GetQuoteRequest = {
                ...mockQuoteRequest,
                supportedTypes: ["oif-escrow-v0", "oif-user-open-v0"],
            };

            const quotes = await provider.getQuotes(requestWithUserOpen);

            expect(quotes[0]?.preparedTransaction).toBeDefined();
            // In oif-user-open-v0, openIntentTx.to is the settlement contract (spender)
            expect(quotes[0]?.preparedTransaction?.to).toBe(OIF_INTEROP_ADDRESSES.SPENDER);
            // The calldata is opaque (call to settlement contract, not ERC20 approve)
            expect(quotes[0]?.preparedTransaction?.data).toBeDefined();
        });
    });

    describe("submitSignedOrder", () => {
        const mockPostOrderResponse: PostOrderResponse = {
            orderId: "test-order-id-456",
            status: PostOrderResponseStatus.Received,
            message: "Order received",
        };

        // Mock EIP-712 signature (130 chars = 0x + 65 bytes in hex)
        // Using repeated pattern to avoid resembling real private keys
        const mockSignature = ("0x" + "ab".repeat(65)) as `0x${string}`;

        // TODO: Unskip when https://github.com/openintentsframework/oif-specs/issues/34 is resolved
        it.skip("should submit signed order successfully", async () => {
            const mockResponse = getMockedOifQuoteResponse();
            const quote = mockResponse.quotes[0];
            if (!quote) throw new Error("No quote in mock");

            vi.mocked(axios.post).mockResolvedValueOnce({
                status: 200,
                data: mockPostOrderResponse,
            });

            const result = await provider.submitSignedOrder(quote, mockSignature);

            // Verify the response is returned correctly
            expect(result).toEqual(mockPostOrderResponse);

            // Verify the HTTP request was made with correct parameters
            const [url, body] = vi.mocked(axios.post).mock.calls[0] as [
                string,
                { order: unknown; signature: Uint8Array; quoteId?: string },
                { headers: Record<string, string>; timeout: number },
            ];

            expect(url).toBe(`${MOCK_SOLVER_URL}/v1/orders`);
            expect(body.order).toEqual(quote.order);
            expect(body.signature).toBeInstanceOf(Uint8Array);
            expect(body.quoteId).toBe(quote.quoteId);
        });

        it("should handle HTTP errors during submission", async () => {
            const mockResponse = getMockedOifQuoteResponse();
            const quote = mockResponse.quotes[0];
            if (!quote) throw new Error("No quote in mock");

            const axiosError = Object.assign(new Error("Solver rejected order"), {
                isAxiosError: true,
                response: { data: { message: "Solver rejected order" } },
            });

            vi.mocked(axios.post).mockRejectedValue(axiosError);

            await expect(provider.submitSignedOrder(quote, mockSignature)).rejects.toThrow(
                ProviderExecuteFailure,
            );
        });

        it("should include custom headers when submitting", async () => {
            const customProvider = new OifProvider({
                solverId: MOCK_SOLVER_ID,
                url: MOCK_SOLVER_URL,
                headers: { "X-API-Key": "test-key" },
            });

            const mockResponse = getMockedOifQuoteResponse();
            const quote = mockResponse.quotes[0];
            if (!quote) throw new Error("No quote in mock");

            vi.mocked(axios.post).mockResolvedValueOnce({
                status: 200,
                data: mockPostOrderResponse,
            });

            await customProvider.submitSignedOrder(quote, mockSignature);

            expect(axios.post).toHaveBeenCalledTimes(1);

            const postCall = vi.mocked(axios.post).mock.calls[0];
            expect(postCall).toBeDefined();
            const [, , config] = postCall as [string, unknown, { headers: Record<string, string> }];
            expect(config.headers).toBeDefined();
            expect(config.headers["X-API-Key"]).toBe("test-key");
        });
    });
});
