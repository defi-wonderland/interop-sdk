import { beforeEach, describe, expect, it, vi } from "vitest";

import type { QuoteRequest } from "../../../src/core/schemas/quoteRequest.js";
import type {
    BungeeAutoRoute,
    BungeeQuoteResponse,
} from "../../../src/protocols/bungee/schemas.js";
import { ProviderConfigFailure } from "../../../src/core/errors/ProviderConfigFailure.exception.js";
import { ProviderExecuteFailure } from "../../../src/core/errors/ProviderExecuteFailure.exception.js";
import { ProviderGetQuoteFailure } from "../../../src/core/errors/ProviderGetQuoteFailure.exception.js";
import { HttpClient, HttpError } from "../../../src/core/utils/httpClient.js";
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

vi.mock("../../../src/core/utils/httpClient.js", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../../src/core/utils/httpClient.js")>();
    return { ...actual, HttpClient: vi.fn() };
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

function makeHttpError(data: unknown, status: number, message: string): HttpError {
    return new HttpError(message, "https://test/url", status, data);
}

// ── Tests ────────────────────────────────────────────────

describe("BungeeProvider", () => {
    let provider: BungeeProvider;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(HttpClient).mockImplementation(function (this: HttpClient) {
            (this as unknown as { get: typeof mockGet; post: typeof mockPost }).get = mockGet;
            (this as unknown as { get: typeof mockGet; post: typeof mockPost }).post = mockPost;
        } as unknown as typeof HttpClient);
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
            expect(HttpClient).toHaveBeenCalledWith(
                expect.objectContaining({
                    baseURL: customUrl,
                }),
            );
        });

        it("sets x-api-key header when apiKey is provided", () => {
            new BungeeProvider({ apiKey: API_KEY });
            expect(HttpClient).toHaveBeenCalledWith(
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
            expect(HttpClient).toHaveBeenCalledWith(
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
            mockGet.mockResolvedValue({
                status: 200,
                data: makeBungeeQuoteResponse(),
                headers: new Headers(),
            });
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
                makeHttpError({ message: "Bad request" }, 400, "Request failed"),
            );
            await expect(provider.getQuotes(makeQuoteRequest())).rejects.toThrow(
                ProviderGetQuoteFailure,
            );
        });

        it("fetches quotes for each submission mode in parallel", async () => {
            const multiModeProvider = new BungeeProvider({
                submissionModes: ["gasless", "user-transaction"],
            });

            mockGet.mockResolvedValue({
                status: 200,
                data: makeBungeeQuoteResponse(),
                headers: new Headers(),
            });
            const quotes = await multiModeProvider.getQuotes(makeQuoteRequest());

            expect(mockGet).toHaveBeenCalledTimes(2);
            expect(quotes).toHaveLength(2);
        });

        it("returns quotes from successful mode when one mode fails", async () => {
            const multiModeProvider = new BungeeProvider({
                submissionModes: ["gasless", "user-transaction"],
            });

            mockGet
                .mockResolvedValueOnce({
                    status: 200,
                    data: makeBungeeQuoteResponse(),
                    headers: new Headers(),
                })
                .mockRejectedValueOnce(new Error("user-transaction failed"));

            const quotes = await multiModeProvider.getQuotes(makeQuoteRequest());
            expect(quotes).toHaveLength(1);
        });

        it("throws when all submission modes fail", async () => {
            const multiModeProvider = new BungeeProvider({
                submissionModes: ["gasless", "user-transaction"],
            });

            mockGet.mockRejectedValue(new Error("all failed"));
            await expect(multiModeProvider.getQuotes(makeQuoteRequest())).rejects.toThrow(
                ProviderGetQuoteFailure,
            );
        });

        it("throws when a mode fails and the others responded with no routes", async () => {
            const multiModeProvider = new BungeeProvider({
                submissionModes: ["gasless", "user-transaction"],
            });

            const emptyResponse = makeBungeeQuoteResponse({
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
                    autoRoute: null,
                    autoRoutes: [],
                    manualRoutes: [],
                },
            });

            mockGet
                .mockResolvedValueOnce({
                    status: 200,
                    data: emptyResponse,
                    headers: new Headers(),
                })
                .mockRejectedValueOnce(new Error("user-transaction failed"));

            await expect(multiModeProvider.getQuotes(makeQuoteRequest())).rejects.toThrow(
                ProviderGetQuoteFailure,
            );
        });

        it("returns an empty array when every mode responds with no routes", async () => {
            const emptyResponse = makeBungeeQuoteResponse({
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
                    autoRoute: null,
                    autoRoutes: [],
                    manualRoutes: [],
                },
            });

            mockGet.mockResolvedValue({
                status: 200,
                data: emptyResponse,
                headers: new Headers(),
            });

            const quotes = await provider.getQuotes(makeQuoteRequest());
            expect(quotes).toEqual([]);
        });
    });

    describe("submitOrder()", () => {
        it("extracts witness from bungeeAutoRoute metadata and submits order", async () => {
            const quoteResponse = makeBungeeQuoteResponse();
            mockGet.mockResolvedValue({
                status: 200,
                data: quoteResponse,
                headers: new Headers(),
            });

            const quotes = await provider.getQuotes(makeQuoteRequest());

            mockPost.mockResolvedValue({
                status: 200,
                data: { success: true, statusCode: 200, result: { hash: "0xsubmithash" } },
                headers: new Headers(),
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

            mockGet.mockResolvedValue({
                status: 200,
                data: quoteResponse,
                headers: new Headers(),
            });
            const quotes = await provider.getQuotes(makeQuoteRequest());

            // Bungee order preserved: autoRoute (quote-123) first, then autoRoutes
            expect(quotes[0]!.quoteId).toBe("quote-123");
            expect(quotes[1]!.quoteId).toBe("route-better");

            mockPost.mockResolvedValue({
                status: 200,
                data: { success: true, statusCode: 200, result: { hash: "0xsubmithash" } },
                headers: new Headers(),
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

        it("passes apiHeaders to openedIntentParserConfig and fillWatcherConfig", () => {
            const authenticatedProvider = new BungeeProvider({
                apiKey: API_KEY,
                affiliateId: "my-affiliate",
            });
            const config = authenticatedProvider.getTrackingConfig();

            const parserConfig = config.openedIntentParserConfig.config as {
                headers?: Record<string, string>;
            };
            expect(parserConfig.headers).toEqual({
                "x-api-key": API_KEY,
                affiliate: "my-affiliate",
            });

            const fillConfig = config.fillWatcherConfig as {
                headers?: Record<string, string>;
            };
            expect(fillConfig.headers).toEqual({
                "x-api-key": API_KEY,
                affiliate: "my-affiliate",
            });
        });

        it("omits headers when no apiKey or affiliateId is configured", () => {
            const config = provider.getTrackingConfig();

            const parserConfig = config.openedIntentParserConfig.config as {
                headers?: Record<string, string>;
            };
            expect(parserConfig.headers).toBeUndefined();

            const fillConfig = config.fillWatcherConfig as {
                headers?: Record<string, string>;
            };
            expect(fillConfig.headers).toBeUndefined();
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
