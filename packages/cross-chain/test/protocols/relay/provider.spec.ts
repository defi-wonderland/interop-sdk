import axios, { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Quote } from "../../../src/core/schemas/quote.js";
import type { QuoteRequest } from "../../../src/core/schemas/quoteRequest.js";
import type { RelayQuoteResponse } from "../../../src/protocols/relay/schemas.js";
import { ProviderExecuteFailure } from "../../../src/core/errors/ProviderExecuteFailure.exception.js";
import { ProviderGetQuoteFailure } from "../../../src/core/errors/ProviderGetQuoteFailure.exception.js";
import { RELAY_TESTNET_TOKENS } from "../../../src/protocols/relay/constants.js";
import { RelayProvider } from "../../../src/protocols/relay/provider.js";

// ── Constants ────────────────────────────────────────────

const VALID_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const RECIPIENT_ADDRESS = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
const ORIGIN_CHAIN_ID = 1;
const DESTINATION_CHAIN_ID = 10;
const INPUT_AMOUNT = "1000000";
const OUTPUT_AMOUNT = "999000";
const TX_DATA = "0xdeadbeef";
const REQUEST_ID = "0xreq123";
const ORDER_ID = "0xorder456";
const TIME_ESTIMATE_SECONDS = 30;
const PROTOCOL_NAME = "relay";
const QUOTE_ENDPOINT = "/quote/v2";
const STEP_DESCRIPTION = "Approve and send";
const API_KEY = "test-key";
const HTTP_STATUS_BAD_REQUEST = 400;
const RELAY_ERROR_AMOUNT_TOO_LOW = "AMOUNT_TOO_LOW";
const RELAY_ERROR_ROUTE_NOT_FOUND = "ROUTE_NOT_FOUND";
const TX_HASH = "0xdeposithash";
const RELAY_BASE_URL = "https://api.relay.link";

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

function makeRelayQuoteResponse(overrides?: Partial<RelayQuoteResponse>): RelayQuoteResponse {
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
        fees: {
            relayer: {
                currency: {
                    chainId: ORIGIN_CHAIN_ID,
                    address: VALID_ADDRESS,
                    symbol: "USDC",
                    name: "USD Coin",
                    decimals: 6,
                },
                amount: "5000",
                amountUsd: "0.005",
            },
            gas: {
                currency: {
                    chainId: ORIGIN_CHAIN_ID,
                    address: "0x0000000000000000000000000000000000000000",
                    symbol: "ETH",
                    name: "Ether",
                    decimals: 18,
                },
                amount: "100000000000000",
                amountUsd: "0.25",
            },
        },
        protocol: { v2: { orderId: ORDER_ID } },
        ...overrides,
    } as RelayQuoteResponse;
}

function makeAxiosError(data: unknown, status: number, message: string, code: string): AxiosError {
    const error = new AxiosError(message, code);
    error.response = { data, status, statusText: "", headers: {}, config: {} as never };
    return error;
}

// ── Tests ────────────────────────────────────────────────

describe("RelayProvider", () => {
    let provider: RelayProvider;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(axios.create).mockReturnValue({
            post: mockPost,
            get: mockGet,
        } as unknown as ReturnType<typeof axios.create>);
        provider = new RelayProvider();
    });

    describe("constructor", () => {
        it("uses default config when none is provided", () => {
            const p = new RelayProvider();
            expect(p.protocolName).toBe(PROTOCOL_NAME);
            expect(p.providerId).toBe(PROTOCOL_NAME);
        });

        it("accepts custom config", () => {
            expect(
                new RelayProvider({
                    providerId: "relay-custom",
                    baseUrl: "https://custom.relay.link",
                }).providerId,
            ).toBe("relay-custom");
        });

        it("sets x-api-key header when apiKey is provided", () => {
            new RelayProvider({ apiKey: API_KEY });
            expect(axios.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    headers: expect.objectContaining({ "x-api-key": API_KEY }) as Record<
                        string,
                        string
                    >,
                }),
            );
        });

        it("uses testnet URL when isTestnet is true", () => {
            new RelayProvider({ isTestnet: true });
            expect(axios.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    baseURL: "https://api.testnets.relay.link",
                }),
            );
        });

        it("explicit baseUrl takes precedence over isTestnet", () => {
            const customUrl = "https://custom.relay.link";
            new RelayProvider({ isTestnet: true, baseUrl: customUrl });
            expect(axios.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    baseURL: customUrl,
                }),
            );
        });
    });

    describe("getQuotes()", () => {
        it("returns one quote by default (user-transaction mode)", async () => {
            mockPost.mockResolvedValue({ data: makeRelayQuoteResponse() });
            const quotes = await provider.getQuotes(makeQuoteRequest());
            expect(quotes).toHaveLength(1);
            expect(mockPost).toHaveBeenCalledTimes(1);
        });

        it("returns quote with standardized fees populated", async () => {
            mockPost.mockResolvedValue({ data: makeRelayQuoteResponse() });
            const [quote] = await provider.getQuotes(makeQuoteRequest());
            expect(quote!.fees).toBeDefined();
            expect(quote!.fees!.bridgeFee).toEqual({
                amount: "5000",
                amountUsd: "0.005",
                token: { symbol: "USDC", decimals: 6, address: VALID_ADDRESS },
            });
            expect(quote!.fees!.originGas).toEqual({
                amount: "100000000000000",
                amountUsd: "0.25",
                token: {
                    symbol: "ETH",
                    decimals: 18,
                    address: "0x0000000000000000000000000000000000000000",
                },
            });
        });

        it("POSTs to /quote/v2 with mapped parameters", async () => {
            mockPost.mockResolvedValue({ data: makeRelayQuoteResponse() });
            await provider.getQuotes(
                makeQuoteRequest({
                    output: {
                        chainId: DESTINATION_CHAIN_ID,
                        assetAddress: VALID_ADDRESS,
                        recipient: RECIPIENT_ADDRESS,
                    },
                }),
            );
            expect(mockPost).toHaveBeenCalledWith(
                QUOTE_ENDPOINT,
                expect.objectContaining({
                    user: VALID_ADDRESS,
                    originChainId: ORIGIN_CHAIN_ID,
                    destinationChainId: DESTINATION_CHAIN_ID,
                    tradeType: "EXACT_INPUT",
                    recipient: RECIPIENT_ADDRESS,
                }),
            );
        });

        it("returns single quote for single-mode config", async () => {
            mockPost.mockResolvedValue({ data: makeRelayQuoteResponse() });
            const singleModeProvider = new RelayProvider({
                submissionModes: ["user-transaction"],
            });
            const quotes = await singleModeProvider.getQuotes(makeQuoteRequest());
            expect(quotes).toHaveLength(1);
            expect(mockPost).toHaveBeenCalledTimes(1);
        });

        it("returns successful quotes when one mode fails", async () => {
            const dualModeProvider = new RelayProvider({
                submissionModes: ["user-transaction", "gasless"],
            });
            mockPost
                .mockRejectedValueOnce(
                    makeAxiosError(
                        { message: "Route not found", errorCode: RELAY_ERROR_ROUTE_NOT_FOUND },
                        HTTP_STATUS_BAD_REQUEST,
                        "bad request",
                        "ERR_BAD_REQUEST",
                    ),
                )
                .mockResolvedValueOnce({ data: makeRelayQuoteResponse() });
            const quotes = await dualModeProvider.getQuotes(makeQuoteRequest());
            expect(quotes).toHaveLength(1);
        });
    });

    describe("getQuotes() — error handling", () => {
        it("preserves the original error cause", async () => {
            mockPost.mockRejectedValue(
                makeAxiosError(
                    { message: RELAY_ERROR_AMOUNT_TOO_LOW, errorCode: RELAY_ERROR_AMOUNT_TOO_LOW },
                    HTTP_STATUS_BAD_REQUEST,
                    "Request failed",
                    "ERR_BAD_REQUEST",
                ),
            );
            const rejection = expect(provider.getQuotes(makeQuoteRequest())).rejects;
            await rejection.toThrow(ProviderGetQuoteFailure);
            await rejection.toSatisfy(
                (err: ProviderGetQuoteFailure) => err.cause === RELAY_ERROR_AMOUNT_TOO_LOW,
            );
        });

        it("throws ProviderGetQuoteFailure on invalid response", async () => {
            mockPost.mockResolvedValue({ data: { steps: "not-an-array" } });
            await expect(provider.getQuotes(makeQuoteRequest())).rejects.toThrow(
                ProviderGetQuoteFailure,
            );
        });
    });

    describe("getTrackingConfig()", () => {
        it("returns api-based fill watcher config and api intent parser", () => {
            const config = provider.getTrackingConfig();
            expect(config.fillWatcherConfig.type).toBe("api-based");
            expect(config.openedIntentParserConfig.type).toBe("api");
        });

        it("includes preTrackerConfig", () => {
            const config = provider.getTrackingConfig();
            expect(config.preTrackerConfig).toBeDefined();
            expect(config.preTrackerConfig.type).toBe("api");
        });

        it("preTrackerConfig builds correct URL and body", () => {
            const config = provider.getTrackingConfig();
            const preTrackerConfig = config.preTrackerConfig;
            expect(preTrackerConfig.buildUrl()).toContain("/transactions/index");
            const body = preTrackerConfig.buildBody({
                txHash: TX_HASH,
                originChainId: ORIGIN_CHAIN_ID,
            });
            expect(body).toEqual({
                chainId: String(ORIGIN_CHAIN_ID),
                txHash: TX_HASH,
            });
        });

        it("preTrackerConfig includes requestId when orderId provided", () => {
            const config = provider.getTrackingConfig();
            const preTrackerConfig = config.preTrackerConfig;
            const orderId = "0xorder123" as `0x${string}`;
            const body = preTrackerConfig.buildBody({
                txHash: TX_HASH,
                originChainId: ORIGIN_CHAIN_ID,
                orderId,
            });
            expect(body).toEqual({
                chainId: String(ORIGIN_CHAIN_ID),
                txHash: TX_HASH,
                requestId: orderId,
            });
        });
    });

    describe("submitOrder()", () => {
        const SIGNATURE = "0xsig123abc" as `0x${string}`;
        const POST_DATA = {
            endpoint: "/execute/permits",
            method: "POST",
            body: { kind: "eip712", requestId: REQUEST_ID },
        };

        function makeQuoteWithSignatureStep(): Quote {
            return {
                order: {
                    steps: [
                        {
                            kind: "signature",
                            chainId: ORIGIN_CHAIN_ID,
                            description: "Sign permit",
                            signaturePayload: {
                                signatureType: "eip712",
                                domain: { name: "Permit2", chainId: ORIGIN_CHAIN_ID },
                                primaryType: "PermitBatch",
                                types: { PermitBatch: [{ name: "spender", type: "address" }] },
                                message: { spender: VALID_ADDRESS },
                            },
                            metadata: {
                                relayPostData: POST_DATA,
                                relayStepId: "authorize1",
                            },
                        },
                    ],
                },
                tracking: { orderId: REQUEST_ID },
                preview: {
                    inputs: [
                        {
                            chainId: ORIGIN_CHAIN_ID,
                            accountAddress: VALID_ADDRESS,
                            assetAddress: VALID_ADDRESS,
                            amount: INPUT_AMOUNT,
                        },
                    ],
                    outputs: [
                        {
                            chainId: DESTINATION_CHAIN_ID,
                            accountAddress: VALID_ADDRESS,
                            assetAddress: VALID_ADDRESS,
                            amount: OUTPUT_AMOUNT,
                        },
                    ],
                },
                provider: PROTOCOL_NAME,
                quoteId: ORDER_ID,
            };
        }

        it("calls submitPermit with correct params and returns orderId", async () => {
            mockPost.mockResolvedValue({ data: { message: "Permit submitted" } });
            const quote = makeQuoteWithSignatureStep();
            const result = await provider.submitOrder(quote, SIGNATURE);
            expect(mockPost).toHaveBeenCalledWith("/execute/permits", POST_DATA.body, {
                params: { signature: SIGNATURE },
            });
            expect(result.orderId).toBe(REQUEST_ID);
        });

        it("propagates API errors as ProviderExecuteFailure", async () => {
            mockPost.mockRejectedValue(
                makeAxiosError(
                    { message: "Invalid permit" },
                    HTTP_STATUS_BAD_REQUEST,
                    "Request failed",
                    "ERR_BAD_REQUEST",
                ),
            );
            const quote = makeQuoteWithSignatureStep();
            await expect(provider.submitOrder(quote, SIGNATURE)).rejects.toThrow(
                ProviderExecuteFailure,
            );
        });
    });

    describe("getDiscoveryConfig()", () => {
        it("returns custom-api config for mainnet", () => {
            const config = new RelayProvider().getDiscoveryConfig();
            expect(config).not.toBeNull();
            expect(config!.type).toBe("custom-api");
        });

        it("points assetsEndpoint to /chains", () => {
            const config = new RelayProvider().getDiscoveryConfig();
            expect(config!.type).toBe("custom-api");
            expect((config!.config as { assetsEndpoint: string }).assetsEndpoint).toBe(
                `${RELAY_BASE_URL}/chains`,
            );
        });

        it("uses custom baseUrl in assetsEndpoint", () => {
            const customUrl = "https://custom.relay.link";
            const config = new RelayProvider({ baseUrl: customUrl }).getDiscoveryConfig();
            expect((config!.config as { assetsEndpoint: string }).assetsEndpoint).toBe(
                `${customUrl}/chains`,
            );
        });

        it("includes API key headers when configured", () => {
            const config = new RelayProvider({ apiKey: API_KEY }).getDiscoveryConfig();
            expect((config!.config as { headers?: Record<string, string> }).headers).toEqual({
                "x-api-key": API_KEY,
            });
        });

        it("omits headers when no API key is configured", () => {
            const config = new RelayProvider().getDiscoveryConfig();
            expect(
                (config!.config as { headers?: Record<string, string> }).headers,
            ).toBeUndefined();
        });

        it("returns static config with testnet tokens for testnet", () => {
            const config = new RelayProvider({ isTestnet: true }).getDiscoveryConfig();
            expect(config!.type).toBe("static");
            expect((config!.config as { networks: unknown }).networks).toBe(RELAY_TESTNET_TOKENS);
        });
    });
});
