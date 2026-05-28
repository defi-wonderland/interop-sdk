import { beforeEach, describe, expect, it, vi } from "vitest";

import type { HttpClient } from "../../../src/core/interfaces/httpClient.interface.js";
import type { QuoteRequest } from "../../../src/core/schemas/quoteRequest.js";
import type {
    BungeeAutoRoute,
    BungeeBuildTxResponse,
    BungeeManualRoute,
    BungeeQuoteResponse,
} from "../../../src/protocols/bungee/schemas.js";
import { PERMIT2_ADDRESS } from "../../../src/core/constants/eip712.js";
import { HttpError } from "../../../src/core/errors/HttpError.exception.js";
import { ProviderConfigFailure } from "../../../src/core/errors/ProviderConfigFailure.exception.js";
import { ProviderExecuteFailure } from "../../../src/core/errors/ProviderExecuteFailure.exception.js";
import { ProviderGetQuoteFailure } from "../../../src/core/errors/ProviderGetQuoteFailure.exception.js";
import { FetchHttpClient } from "../../../src/core/utils/httpClient.js";
import { BungeeProvider } from "../../../src/protocols/bungee/provider.js";

// ── Constants ────────────────────────────────────────────

const VALID_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const BUNGEE_GATEWAY = "0xCDeA28EE7bd5bf7710b294d9391E1B6A318D809a";
const ORIGIN_CHAIN_ID = 1;
const DESTINATION_CHAIN_ID = 10;
const INPUT_AMOUNT = "1000000";
const OUTPUT_AMOUNT = "999000";
const API_KEY = "test-key";
const BUNGEE_BASE_URL = "https://public-backend.bungee.exchange";
const PROTOCOL_NAME = "bungee";
const FUTURE_DEADLINE = Math.floor(Date.now() / 1000) + 3600;

// ── Mock & Helpers ───────────────────────────────────────

vi.mock("../../../src/core/utils/httpClient.js", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../../src/core/utils/httpClient.js")>();
    return { ...actual, FetchHttpClient: vi.fn() };
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
            domain: {
                name: "Permit2",
                chainId: ORIGIN_CHAIN_ID,
                verifyingContract: PERMIT2_ADDRESS,
            },
            types: {
                PermitWitnessTransferFrom: [
                    { name: "permitted", type: "TokenPermissions" },
                    { name: "spender", type: "address" },
                    { name: "nonce", type: "uint256" },
                    { name: "deadline", type: "uint256" },
                    { name: "witness", type: "Request" },
                ],
                TokenPermissions: [
                    { name: "token", type: "address" },
                    { name: "amount", type: "uint256" },
                ],
                Request: [{ name: "basicReq", type: "BasicRequest" }],
                BasicRequest: [
                    { name: "originChainId", type: "uint256" },
                    { name: "destinationChainId", type: "uint256" },
                    { name: "deadline", type: "uint256" },
                    { name: "nonce", type: "uint256" },
                    { name: "sender", type: "address" },
                    { name: "receiver", type: "address" },
                    { name: "delegate", type: "address" },
                    { name: "bungeeGateway", type: "address" },
                    { name: "switchboardId", type: "uint32" },
                    { name: "inputToken", type: "address" },
                    { name: "inputAmount", type: "uint256" },
                    { name: "outputToken", type: "address" },
                    { name: "minOutputAmount", type: "uint256" },
                    { name: "refuelAmount", type: "uint256" },
                ],
            },
            values: {
                permitted: { token: VALID_ADDRESS, amount: INPUT_AMOUNT },
                spender: BUNGEE_GATEWAY,
                nonce: "1",
                deadline: FUTURE_DEADLINE,
                witness: {
                    basicReq: {
                        originChainId: ORIGIN_CHAIN_ID,
                        destinationChainId: DESTINATION_CHAIN_ID,
                        deadline: FUTURE_DEADLINE,
                        nonce: "1",
                        sender: VALID_ADDRESS,
                        receiver: VALID_ADDRESS,
                        delegate: VALID_ADDRESS,
                        bungeeGateway: BUNGEE_GATEWAY,
                        switchboardId: 1,
                        inputToken: VALID_ADDRESS,
                        inputAmount: INPUT_AMOUNT,
                        outputToken: VALID_ADDRESS,
                        minOutputAmount: "0",
                        refuelAmount: "0",
                    },
                },
            },
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

function makeManualRoute(overrides: Record<string, unknown> = {}): BungeeManualRoute {
    return {
        quoteId: "manual-1",
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
        estimatedTime: 60,
        routeDetails: { name: "Across", logoURI: "https://example.com/across.png" },
        ...overrides,
    };
}

function makeBuildTxResponse(): BungeeBuildTxResponse {
    return {
        success: true,
        statusCode: 200,
        result: {
            userOp: "tx",
            txData: {
                to: VALID_ADDRESS,
                data: "0xdeadbeef",
                value: "0",
                chainId: ORIGIN_CHAIN_ID,
            },
            approvalData: {
                spenderAddress: "0x3a23F943181408EAC424116Af7b7790c94Cb97a5",
                amount: INPUT_AMOUNT,
                tokenAddress: VALID_ADDRESS,
                userAddress: VALID_ADDRESS,
            },
        },
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
        vi.mocked(FetchHttpClient).mockImplementation(function (this: HttpClient) {
            (this as unknown as { get: typeof mockGet; post: typeof mockPost }).get = mockGet;
            (this as unknown as { get: typeof mockGet; post: typeof mockPost }).post = mockPost;
        } as unknown as typeof FetchHttpClient);
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
            expect(FetchHttpClient).toHaveBeenCalledWith(
                expect.objectContaining({
                    baseURL: customUrl,
                }),
            );
        });

        it("sets x-api-key header when apiKey is provided", () => {
            new BungeeProvider({ apiKey: API_KEY });
            expect(FetchHttpClient).toHaveBeenCalledWith(
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
            expect(FetchHttpClient).toHaveBeenCalledWith(
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

        it("ignores manualRoutes when enableOtherProviders is not set", async () => {
            const response = makeBungeeQuoteResponse();
            (response.result as Record<string, unknown>).manualRoutes = [makeManualRoute()];

            mockGet.mockResolvedValue({
                status: 200,
                data: response,
                headers: new Headers(),
            });

            const quotes = await provider.getQuotes(makeQuoteRequest());

            // Only the auto route should appear; build-tx must NOT be called
            expect(quotes).toHaveLength(1);
            expect(quotes[0]!.metadata?.bungeeAutoRoute).toBeDefined();
            expect(mockGet).toHaveBeenCalledTimes(1);
        });

        it("appends manualRoutes built via /build-tx when enableOtherProviders is true", async () => {
            const otherProvider = new BungeeProvider({ enableOtherProviders: true });

            const quoteResponse = makeBungeeQuoteResponse();
            (quoteResponse.result as Record<string, unknown>).manualRoutes = [
                makeManualRoute({ quoteId: "manual-A" }),
                makeManualRoute({ quoteId: "manual-B" }),
            ];

            mockGet.mockImplementation(async (url: string) => {
                if (url === "/api/v1/bungee/quote") {
                    return { status: 200, data: quoteResponse, headers: new Headers() };
                }
                if (url === "/api/v1/bungee/build-tx") {
                    return { status: 200, data: makeBuildTxResponse(), headers: new Headers() };
                }
                throw new Error(`unexpected GET ${url}`);
            });

            const quotes = await otherProvider.getQuotes(makeQuoteRequest());

            // 1 auto + 2 manual
            expect(quotes).toHaveLength(3);
            expect(quotes[1]!.metadata?.bungeeManualRoute).toBeDefined();
            expect(quotes[2]!.metadata?.bungeeManualRoute).toBeDefined();

            // build-tx is called for every manual route
            const buildTxCalls = mockGet.mock.calls.filter(
                (call) => call[0] === "/api/v1/bungee/build-tx",
            );
            expect(buildTxCalls).toHaveLength(2);
        });

        it("forwards enableManual=true to the quote query when enableOtherProviders is true", async () => {
            const otherProvider = new BungeeProvider({ enableOtherProviders: true });

            mockGet.mockImplementation(async (url: string) => {
                if (url === "/api/v1/bungee/quote") {
                    return {
                        status: 200,
                        data: makeBungeeQuoteResponse(),
                        headers: new Headers(),
                    };
                }
                throw new Error(`unexpected GET ${url}`);
            });

            await otherProvider.getQuotes(makeQuoteRequest());

            expect(mockGet).toHaveBeenCalledWith(
                "/api/v1/bungee/quote",
                expect.objectContaining({
                    params: expect.objectContaining({ enableManual: "true" }) as Record<
                        string,
                        unknown
                    >,
                }),
            );
        });

        it("isolates a failing build-tx — auto and remaining manuals still come back", async () => {
            const otherProvider = new BungeeProvider({ enableOtherProviders: true });

            const quoteResponse = makeBungeeQuoteResponse();
            (quoteResponse.result as Record<string, unknown>).manualRoutes = [
                makeManualRoute({ quoteId: "manual-A" }),
                makeManualRoute({ quoteId: "manual-B" }),
            ];

            let buildTxCallIndex = 0;
            mockGet.mockImplementation(async (url: string) => {
                if (url === "/api/v1/bungee/quote") {
                    return { status: 200, data: quoteResponse, headers: new Headers() };
                }
                if (url === "/api/v1/bungee/build-tx") {
                    buildTxCallIndex += 1;
                    if (buildTxCallIndex === 1) {
                        throw new Error("build-tx failed for manual-A");
                    }
                    return { status: 200, data: makeBuildTxResponse(), headers: new Headers() };
                }
                throw new Error(`unexpected GET ${url}`);
            });

            const quotes = await otherProvider.getQuotes(makeQuoteRequest());

            // 1 auto + 1 surviving manual
            expect(quotes).toHaveLength(2);
        });

        it("manual route quotes leave tracking undefined while auto routes keep requestHash", async () => {
            const otherProvider = new BungeeProvider({ enableOtherProviders: true });

            const quoteResponse = makeBungeeQuoteResponse();
            (quoteResponse.result as Record<string, unknown>).manualRoutes = [makeManualRoute()];

            mockGet.mockImplementation(async (url: string) => {
                if (url === "/api/v1/bungee/quote") {
                    return { status: 200, data: quoteResponse, headers: new Headers() };
                }
                if (url === "/api/v1/bungee/build-tx") {
                    return { status: 200, data: makeBuildTxResponse(), headers: new Headers() };
                }
                throw new Error(`unexpected GET ${url}`);
            });

            const quotes = await otherProvider.getQuotes(makeQuoteRequest());

            const auto = quotes.find((q) => q.metadata?.bungeeAutoRoute !== undefined);
            const manual = quotes.find((q) => q.metadata?.bungeeManualRoute !== undefined);

            expect(auto!.tracking?.orderId).toBe("0xreqhash");
            expect(manual!.tracking).toBeUndefined();
        });

        it("does not request multiple routes by default", async () => {
            mockGet.mockResolvedValue({
                status: 200,
                data: makeBungeeQuoteResponse(),
                headers: new Headers(),
            });
            await provider.getQuotes(makeQuoteRequest());

            const [, options] = mockGet.mock.calls[0] as [
                string,
                { params: Record<string, string> },
            ];
            expect(options.params.enableMultipleAutoRoutes).toBeUndefined();
        });

        it("requests multiple routes when enableMultipleRoutes is true", async () => {
            const multiRouteProvider = new BungeeProvider({ enableMultipleRoutes: true });
            mockGet.mockResolvedValue({
                status: 200,
                data: makeBungeeQuoteResponse(),
                headers: new Headers(),
            });
            await multiRouteProvider.getQuotes(makeQuoteRequest());

            const [, options] = mockGet.mock.calls[0] as [
                string,
                { params: Record<string, string> },
            ];
            expect(options.params.enableMultipleAutoRoutes).toBe("true");
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
                    request: quoteResponse.result.autoRoute!.signTypedData!.values.witness,
                    userSignature: "0xsignature",
                    requestType: "SINGLE_OUTPUT_REQUEST",
                    quoteId: "quote-123",
                }),
            );
        });

        it("uses the specific autoRoute from metadata, not result.autoRoute", async () => {
            const quoteResponse = makeBungeeQuoteResponse();
            const betterRoute = makeAutoRoute({
                quoteId: "route-better",
                output: {
                    ...makeAutoRoute().output,
                    amount: "1500000",
                },
            });
            // Make this route's witness distinguishable so we can prove the
            // submit picked the right one.
            (
                (betterRoute.signTypedData!.values.witness as Record<string, unknown>)
                    .basicReq as Record<string, unknown>
            ).nonce = "route-better-nonce";
            (quoteResponse.result as Record<string, unknown>).autoRoutes = [betterRoute];

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

            await provider.submitOrder(quotes[1]!, "0xsignature");

            expect(mockPost).toHaveBeenCalledWith(
                "/api/v1/bungee/submit",
                expect.objectContaining({
                    request: betterRoute.signTypedData!.values.witness,
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
        it("opened-intent URL queries by txHash (the on-chain origin tx hash)", () => {
            const config = provider.getTrackingConfig();
            expect(config.openedIntentParserConfig.type).toBe("api");

            const apiConfig = config.openedIntentParserConfig.config as {
                buildUrl: (txHash: string, chainId: number) => string;
            };
            const url = apiConfig.buildUrl("0xonchaintx", ORIGIN_CHAIN_ID);
            expect(url).toContain("/api/v1/bungee/status");
            expect(url).toContain("txHash=0xonchaintx");
        });

        it("fillWatcher endpoint keeps querying by requestHash for auto routes", () => {
            const config = provider.getTrackingConfig();
            const fillConfig = config.fillWatcherConfig as {
                buildEndpoint: (params: { orderId: string }) => string;
            };
            const endpoint = fillConfig.buildEndpoint({ orderId: "0xreqhash" });
            expect(endpoint).toBe("/api/v1/bungee/status?requestHash=0xreqhash");
        });

        it("onChainFillWatcher endpoint queries by openTxHash for manual routes", () => {
            const config = provider.getTrackingConfig();
            const fillConfig = config.onChainFillWatcherConfig as {
                buildEndpoint: (params: { orderId: string; openTxHash?: string }) => string;
            };
            const endpoint = fillConfig.buildEndpoint({
                orderId: "0xstatushash",
                openTxHash: "0xonchaintx",
            });
            expect(endpoint).toBe("/api/v1/bungee/status?txHash=0xonchaintx");
        });

        it("onChainFillWatcher reuses the same polling and retry settings as the API watcher", () => {
            const config = provider.getTrackingConfig();
            const auto = config.fillWatcherConfig as {
                pollingInterval: number;
                retry: Record<string, number>;
            };
            const onChain = config.onChainFillWatcherConfig as {
                pollingInterval: number;
                retry: Record<string, number>;
            };
            expect(onChain.pollingInterval).toBe(auto.pollingInterval);
            expect(onChain.retry).toEqual(auto.retry);
        });

        it("fillWatcher has 5000ms polling interval", () => {
            const config = provider.getTrackingConfig();
            expect(config.fillWatcherConfig.type).toBe("api-based");
            expect((config.fillWatcherConfig as { pollingInterval: number }).pollingInterval).toBe(
                5000,
            );
        });

        it("passes apiHeaders to all tracking sub-configs", () => {
            const authenticatedProvider = new BungeeProvider({
                apiKey: API_KEY,
                affiliateId: "my-affiliate",
            });
            const config = authenticatedProvider.getTrackingConfig();
            const expected = { "x-api-key": API_KEY, affiliate: "my-affiliate" };

            const parserConfig = config.openedIntentParserConfig.config as {
                headers?: Record<string, string>;
            };
            const fillConfig = config.fillWatcherConfig as {
                headers?: Record<string, string>;
            };
            const onChainFillConfig = config.onChainFillWatcherConfig as {
                headers?: Record<string, string>;
            };

            expect(parserConfig.headers).toEqual(expected);
            expect(fillConfig.headers).toEqual(expected);
            expect(onChainFillConfig.headers).toEqual(expected);
        });

        it("omits headers when no apiKey or affiliateId is configured", () => {
            const config = provider.getTrackingConfig();

            const parserConfig = config.openedIntentParserConfig.config as {
                headers?: Record<string, string>;
            };
            const fillConfig = config.fillWatcherConfig as {
                headers?: Record<string, string>;
            };
            const onChainFillConfig = config.onChainFillWatcherConfig as {
                headers?: Record<string, string>;
            };

            expect(parserConfig.headers).toBeUndefined();
            expect(fillConfig.headers).toBeUndefined();
            expect(onChainFillConfig.headers).toBeUndefined();
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

    describe("getOrderExplorers()", () => {
        it("returns the socketscan tracker URL alongside the chain explorer URLs", () => {
            const explorers = provider.getOrderExplorers({
                originChainId: 8453,
                originTxHash: "0x9bdfe864",
                destinationChainId: 42161,
                destinationTxHash: "0xfeedface",
            });
            expect(explorers.tracker).toBe("https://www.socketscan.io/tx/0x9bdfe864");
            expect(explorers.origin).toBe("https://basescan.org/tx/0x9bdfe864");
            expect(explorers.destination).toBe("https://arbiscan.io/tx/0xfeedface");
        });

        it("returns an empty object when no tx hash is available", () => {
            const explorers = provider.getOrderExplorers({ originChainId: 8453 });
            expect(explorers).toEqual({});
        });
    });
});
