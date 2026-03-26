import axios, { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { QuoteRequest } from "../../../src/core/schemas/quoteRequest.js";
import type {
    BungeeAutoRoute,
    BungeeQuoteResponse,
} from "../../../src/protocols/bungee/schemas.js";
import { ProviderConfigFailure } from "../../../src/core/errors/ProviderConfigFailure.exception.js";
import { ProviderExecuteFailure } from "../../../src/core/errors/ProviderExecuteFailure.exception.js";
import { ProviderGetQuoteFailure } from "../../../src/core/errors/ProviderGetQuoteFailure.exception.js";
import { BungeeProvider } from "../../../src/protocols/bungee/provider.js";

// ── Constants ────────────────────────────────────────────

const VALID_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const ORIGIN_CHAIN_ID = 1;
const DESTINATION_CHAIN_ID = 10;
const INPUT_AMOUNT = "1000000";
const OUTPUT_AMOUNT = "999000";
const API_KEY = "test-key";
const BUNGEE_BASE_URL = "https://public-backend.bungee.exchange";
const PROTOCOL_NAME = "bungee";

// ── Mock & Helpers ───────────────────────────────────────

vi.mock("axios", async (importOriginal) => {
    const actual = await importOriginal<typeof import("axios")>();
    return { ...actual, default: { ...actual.default, create: vi.fn() } };
});

const mockPost = vi.fn();
const mockGet = vi.fn();

function makeQuoteRequest(overrides?: Partial<QuoteRequest>): QuoteRequest {
    return {
        user: VALID_ADDRESS,
        input: { chainId: ORIGIN_CHAIN_ID, assetAddress: VALID_ADDRESS, amount: INPUT_AMOUNT },
        output: { chainId: DESTINATION_CHAIN_ID, assetAddress: VALID_ADDRESS },
        ...overrides,
    };
}

function makeAutoRoute(overrides: Record<string, unknown> = {}): BungeeAutoRoute {
    return {
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
        ...overrides,
    };
}

function makeBungeeQuoteResponse(overrides?: Partial<BungeeQuoteResponse>): BungeeQuoteResponse {
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
            autoRoute: makeAutoRoute(),
            manualRoutes: [],
        },
        ...overrides,
    };
}

function makeAxiosError(data: unknown, status: number, message: string, code: string): AxiosError {
    const error = new AxiosError(message, code);
    error.response = { data, status, statusText: "", headers: {}, config: {} as never };
    return error;
}

// ── Tests ────────────────────────────────────────────────

describe("BungeeProvider", () => {
    let provider: BungeeProvider;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(axios.create).mockReturnValue({
            post: mockPost,
            get: mockGet,
        } as unknown as ReturnType<typeof axios.create>);
        provider = new BungeeProvider();
    });

    describe("constructor", () => {
        it("creates with default config", () => {
            const p = new BungeeProvider();
            expect(p.protocolName).toBe(PROTOCOL_NAME);
            expect(p.providerId).toBe(PROTOCOL_NAME);
        });

        it("creates with custom baseUrl", () => {
            const customUrl = "https://custom.bungee.exchange";
            new BungeeProvider({ baseUrl: customUrl });
            expect(axios.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    baseURL: customUrl,
                }),
            );
        });

        it("sets x-api-key header when apiKey is provided", () => {
            new BungeeProvider({ apiKey: API_KEY });
            expect(axios.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    headers: expect.objectContaining({ "x-api-key": API_KEY }) as Record<
                        string,
                        string
                    >,
                }),
            );
        });

        it("sets affiliate header when affiliateId is provided", () => {
            new BungeeProvider({ affiliateId: "my-affiliate" });
            expect(axios.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    headers: expect.objectContaining({ affiliate: "my-affiliate" }) as Record<
                        string,
                        string
                    >,
                }),
            );
        });

        it("throws ProviderConfigFailure for invalid config", () => {
            expect(() => new BungeeProvider({ baseUrl: "not-a-url" })).toThrow(
                ProviderConfigFailure,
            );
        });
    });

    describe("getQuotes()", () => {
        it("adapts request and returns quotes with correct structure", async () => {
            mockGet.mockResolvedValue({ data: makeBungeeQuoteResponse() });
            const quotes = await provider.getQuotes(makeQuoteRequest());
            expect(quotes).toHaveLength(1);
            expect(quotes[0]!.provider).toBe(PROTOCOL_NAME);
            expect(quotes[0]!.order.steps).toHaveLength(1);
            expect(quotes[0]!.preview.inputs).toHaveLength(1);
            expect(quotes[0]!.preview.outputs).toHaveLength(1);
            expect(quotes[0]!.metadata?.bungeeResponse).toBeDefined();
        });

        it("wraps errors in ProviderGetQuoteFailure", async () => {
            mockGet.mockRejectedValue(
                makeAxiosError(
                    { message: "Bad request" },
                    400,
                    "Request failed",
                    "ERR_BAD_REQUEST",
                ),
            );
            await expect(provider.getQuotes(makeQuoteRequest())).rejects.toThrow(
                ProviderGetQuoteFailure,
            );
        });
    });

    describe("submitOrder()", () => {
        it("extracts witness from bungeeAutoRoute metadata and submits order", async () => {
            const quoteResponse = makeBungeeQuoteResponse();
            mockGet.mockResolvedValue({ data: quoteResponse });

            const quotes = await provider.getQuotes(makeQuoteRequest());

            mockPost.mockResolvedValue({
                data: { success: true, statusCode: 200, result: { hash: "0xsubmithash" } },
            });

            const result = await provider.submitOrder(quotes[0]!, "0xsignature");
            expect(result.orderId).toBeDefined();
            expect(result.status).toBe("submitted");
            expect(mockPost).toHaveBeenCalledWith(
                "/api/v1/bungee/submit",
                expect.objectContaining({
                    request: { field: "value" },
                    userSignature: "0xsignature",
                    requestType: "SINGLE_OUTPUT_REQUEST",
                    quoteId: "quote-123",
                }),
            );
        });

        it("uses the specific autoRoute from metadata, not result.autoRoute", async () => {
            const quoteResponse = makeBungeeQuoteResponse();
            // Add a different route in autoRoutes with higher output
            (quoteResponse.result as Record<string, unknown>).autoRoutes = [
                makeAutoRoute({
                    quoteId: "route-better",
                    output: {
                        ...makeAutoRoute().output,
                        amount: "1500000",
                    },
                    signTypedData: {
                        domain: { name: "Permit2" },
                        types: {},
                        values: { witness: { betterField: "betterValue" } },
                    },
                }),
            ];

            mockGet.mockResolvedValue({ data: quoteResponse });
            const quotes = await provider.getQuotes(makeQuoteRequest());

            // Bungee order preserved: autoRoute (quote-123) first, then autoRoutes
            expect(quotes[0]!.quoteId).toBe("quote-123");
            expect(quotes[1]!.quoteId).toBe("route-better");

            mockPost.mockResolvedValue({
                data: { success: true, statusCode: 200, result: { hash: "0xsubmithash" } },
            });

            // Submit with route-better (second quote, from autoRoutes)
            await provider.submitOrder(quotes[1]!, "0xsignature");

            // Should submit with route-better's witness from bungeeAutoRoute metadata
            expect(mockPost).toHaveBeenCalledWith(
                "/api/v1/bungee/submit",
                expect.objectContaining({
                    request: { betterField: "betterValue" },
                    quoteId: "route-better",
                }),
            );
        });

        it("throws ProviderExecuteFailure for missing metadata", async () => {
            const quote = {
                provider: PROTOCOL_NAME,
                order: { steps: [] },
                preview: { inputs: [], outputs: [] },
                partialFill: false,
                failureHandling: "refund-automatic" as const,
                metadata: {},
            };
            await expect(provider.submitOrder(quote, "0xsignature")).rejects.toThrow(
                ProviderExecuteFailure,
            );
        });
    });

    describe("getTrackingConfig()", () => {
        it("returns correct URLs with requestHash parameter", () => {
            const config = provider.getTrackingConfig();
            expect(config.openedIntentParserConfig.type).toBe("api");

            const apiConfig = config.openedIntentParserConfig.config as {
                buildUrl: (txHash: string, chainId: number) => string;
            };
            const url = apiConfig.buildUrl("0xreqhash", ORIGIN_CHAIN_ID);
            expect(url).toContain("/api/v1/bungee/status");
            expect(url).toContain("requestHash=0xreqhash");
        });

        it("fillWatcher has 5000ms polling interval", () => {
            const config = provider.getTrackingConfig();
            expect(config.fillWatcherConfig.type).toBe("api-based");
            expect((config.fillWatcherConfig as { pollingInterval: number }).pollingInterval).toBe(
                5000,
            );
        });
    });

    describe("getDiscoveryConfig()", () => {
        it("returns custom-api type with correct endpoint", () => {
            const config = new BungeeProvider().getDiscoveryConfig();
            expect(config).not.toBeNull();
            expect(config!.type).toBe("custom-api");
            expect((config!.config as { assetsEndpoint: string }).assetsEndpoint).toBe(
                `${BUNGEE_BASE_URL}/api/v1/tokens/list?list=trending`,
            );
        });
    });
});
