import { GetQuoteRequest } from "@openintentsframework/oif-specs";
import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OifProvider, ProviderGetQuoteFailure } from "../../src/external.js";
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
});
