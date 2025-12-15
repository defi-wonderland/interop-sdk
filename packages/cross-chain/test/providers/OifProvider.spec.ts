import {
    GetQuoteRequest,
    PostOrderResponse,
    PostOrderResponseStatus,
} from "@openintentsframework/oif-specs";
import axios from "axios";
import { EIP1193Provider } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    OifProvider,
    ProviderExecuteFailure,
    ProviderExecuteNotImplemented,
    ProviderGetQuoteFailure,
} from "../../src/external.js";
import { getMockedOifQuoteResponse, getMockedOifUserOpenQuoteResponse } from "../mocks/oifApi.js";

vi.mock("axios");

const MOCK_SOLVER_URL = "https://mock-solver.example.com";
const MOCK_SOLVER_ID = "mock-solver-1";

// EIP-7930 interop addresses for testing
const USER_ADDRESS = "0x000100000101742d35Cc6634C0532925a3b844Bc9e7595f0bEb8"; // Ethereum mainnet
const USDC_ADDRESS = "0x000100000101A0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC on Ethereum
const USDT_ADDRESS = "0x000100000101dAC17F958D2ee523a2206206994597C13D831ec7"; // USDT on Ethereum

describe("OifProvider", () => {
    const provider = new OifProvider({
        solverId: MOCK_SOLVER_ID,
        url: MOCK_SOLVER_URL,
    });
    const mockOifResponse = getMockedOifQuoteResponse();

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
            user: USER_ADDRESS,
            intent: {
                intentType: "oif-swap",
                inputs: [
                    {
                        user: USER_ADDRESS,
                        asset: USDC_ADDRESS,
                        amount: "1000000000000000000",
                    },
                ],
                outputs: [
                    {
                        receiver: USER_ADDRESS,
                        asset: USDT_ADDRESS,
                    },
                ],
                swapType: "exact-input",
            },
            supportedTypes: ["oif-escrow-v0"],
        };

        it("should call solver with correct endpoint", async () => {
            vi.mocked(axios.post).mockResolvedValue({
                status: 200,
                data: mockOifResponse,
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
                data: mockOifResponse,
            });

            const quotes = await provider.getQuotes(mockQuoteRequest);

            expect(quotes).toHaveLength(1);
            expect(quotes[0]).toHaveProperty("order");
            expect(quotes[0]).toHaveProperty("preview");
            expect(quotes[0]).toHaveProperty("provider");
        });

        it("should inject solverId as provider fallback", async () => {
            const responseWithoutProvider = getMockedOifQuoteResponse();
            const firstQuote = responseWithoutProvider.quotes[0];
            if (firstQuote) {
                firstQuote.provider = undefined;
            }

            vi.mocked(axios.post).mockResolvedValue({
                status: 200,
                data: responseWithoutProvider,
            });

            const quotes = await provider.getQuotes(mockQuoteRequest);

            expect(quotes[0]?.provider).toBe(MOCK_SOLVER_ID);
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
            expect(quotes[0]?.preparedTransaction?.to).toBe(USDC_ADDRESS);
            expect(quotes[0]?.preparedTransaction?.data).toBe("0x095ea7b3000000000000000000000000");
        });
    });

    describe("execute", () => {
        const mockSigner: EIP1193Provider = {
            request: vi.fn(),
            on: vi.fn(),
            removeListener: vi.fn(),
        };

        it("should throw error directing to new API", async () => {
            const mockResponse = getMockedOifQuoteResponse();
            const quote = mockResponse.quotes[0];
            if (!quote) throw new Error("No quote in mock");

            await expect(provider.execute(quote, mockSigner)).rejects.toThrow(
                "execute() is not implemented",
            );
            await expect(provider.execute(quote, mockSigner)).rejects.toThrow(
                "Use getTypedDataToSign()",
            );
        });
    });

    describe("getTypedDataToSign", () => {
        it("should return EIP-712 typed data for oif-escrow-v0 orders", () => {
            const mockResponse = getMockedOifQuoteResponse();
            const quote = mockResponse.quotes[0];
            if (!quote) throw new Error("No quote in mock");

            const typedData = provider.getTypedDataToSign(quote);

            expect(typedData).toHaveProperty("domain");
            expect(typedData).toHaveProperty("primaryType");
            expect(typedData).toHaveProperty("message");
            expect(typedData).toHaveProperty("types");
        });

        it("should throw for unsupported order types", () => {
            const mockResponse = getMockedOifQuoteResponse();
            const quote = mockResponse.quotes[0];
            if (!quote) throw new Error("No quote in mock");

            const modifiedQuote = {
                ...quote,
                order: {
                    ...quote.order,
                    type: "oif-user-open-v0" as never,
                },
            };

            expect(() => provider.getTypedDataToSign(modifiedQuote)).toThrow(
                ProviderExecuteNotImplemented,
            );
        });

        it("should throw for unsupported signature types", () => {
            const mockResponse = getMockedOifQuoteResponse({
                override: {
                    quotes: [
                        {
                            order: {
                                type: "oif-escrow-v0",
                                payload: {
                                    signatureType: "unsupported-type" as never,
                                    domain: {},
                                    primaryType: "",
                                    message: {},
                                    types: {},
                                },
                            },
                            preview: { inputs: [], outputs: [] },
                            validUntil: 0,
                            eta: 0,
                            quoteId: "test",
                            provider: "test",
                            failureHandling: "refund-automatic",
                            partialFill: false,
                        },
                    ],
                },
            });
            const quote = mockResponse.quotes[0];
            if (!quote) throw new Error("No quote in mock");

            expect(() => provider.getTypedDataToSign(quote)).toThrow(
                'Unsupported signature type: unsupported-type. Only "eip712" is supported.',
            );
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

        it("should submit signed order successfully", async () => {
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
                { order: unknown; signature: Uint8Array; quoteId: string },
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

            vi.mocked(axios.post).mockRejectedValueOnce(axiosError);

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
