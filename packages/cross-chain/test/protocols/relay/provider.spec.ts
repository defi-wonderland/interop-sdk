import axios, { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { QuoteRequest } from "../../../src/core/schemas/quoteRequest.js";
import type { RelayQuoteResponse } from "../../../src/protocols/relay/schemas.js";
import { ProviderGetQuoteFailure } from "../../../src/core/errors/ProviderGetQuoteFailure.exception.js";
import { AssetDiscoveryFactory, RelayAssetDiscoveryService } from "../../../src/internal.js";
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
const INDEX_ENDPOINT = "/transactions/index";
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
        it("returns a valid SDK Quote from Relay response", async () => {
            mockPost.mockResolvedValue({ data: makeRelayQuoteResponse() });
            const [quote] = await provider.getQuotes(makeQuoteRequest());
            expect(quote!.provider).toBe(PROTOCOL_NAME);
            expect(quote!.order.steps).toHaveLength(1);
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
    });

    describe("getQuotes() — error handling", () => {
        it("extracts message from Relay bad request response", async () => {
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

        it("falls back to axios message when response body is not parseable", async () => {
            mockPost.mockRejectedValue(
                makeAxiosError("not json", 500, "Network Error", "ERR_NETWORK"),
            );
            const rejection = expect(provider.getQuotes(makeQuoteRequest())).rejects;
            await rejection.toThrow(ProviderGetQuoteFailure);
            await rejection.toSatisfy(
                (err: ProviderGetQuoteFailure) => err.cause === "Network Error",
            );
        });

        it("wraps ZodError from invalid response shape", async () => {
            mockPost.mockResolvedValue({ data: { steps: "not-an-array" } });
            await expect(provider.getQuotes(makeQuoteRequest())).rejects.toThrow(
                ProviderGetQuoteFailure,
            );
        });

        it("wraps unexpected error types", async () => {
            mockPost.mockRejectedValue("unexpected string error");
            await expect(provider.getQuotes(makeQuoteRequest())).rejects.toThrow(
                ProviderGetQuoteFailure,
            );
        });

        it("does not double-wrap ProviderGetQuoteFailure", async () => {
            mockPost.mockRejectedValue(
                makeAxiosError(
                    {
                        message: RELAY_ERROR_ROUTE_NOT_FOUND,
                        errorCode: RELAY_ERROR_ROUTE_NOT_FOUND,
                    },
                    HTTP_STATUS_BAD_REQUEST,
                    "bad request",
                    "ERR_BAD_REQUEST",
                ),
            );
            const rejection = expect(provider.getQuotes(makeQuoteRequest())).rejects;
            await rejection.toBeInstanceOf(ProviderGetQuoteFailure);
            await rejection.toSatisfy(
                (err: ProviderGetQuoteFailure) => err.cause === RELAY_ERROR_ROUTE_NOT_FOUND,
            );
        });
    });

    describe("notifyDeposit()", () => {
        it("delegates to /transactions/index with stringified chainId", async () => {
            mockPost.mockResolvedValue({ data: { message: "Transaction indexed" } });
            await provider.notifyDeposit(TX_HASH, ORIGIN_CHAIN_ID);
            expect(mockPost).toHaveBeenCalledWith(INDEX_ENDPOINT, {
                chainId: String(ORIGIN_CHAIN_ID),
                txHash: TX_HASH,
            });
        });

        it("propagates errors from the API", async () => {
            mockPost.mockRejectedValue(
                makeAxiosError(
                    { message: "Not found" },
                    HTTP_STATUS_BAD_REQUEST,
                    "Request failed",
                    "ERR_BAD_REQUEST",
                ),
            );
            await expect(provider.notifyDeposit(TX_HASH, ORIGIN_CHAIN_ID)).rejects.toThrow();
        });
    });

    describe("getTrackingConfig()", () => {
        it("returns api-based fill watcher config and api intent parser", () => {
            const config = provider.getTrackingConfig();
            expect(config.fillWatcherConfig.type).toBe("api-based");
            expect(config.openedIntentParserConfig.type).toBe("api");
        });

        it("includes onBeforeTracking hook", () => {
            const config = provider.getTrackingConfig();
            expect(config.onBeforeTracking).toBeDefined();
            expect(typeof config.onBeforeTracking).toBe("function");
        });

        it("onBeforeTracking calls /transactions/index with stringified chainId", async () => {
            mockPost.mockResolvedValue({ data: { message: "Transaction indexed" } });
            const config = provider.getTrackingConfig();
            await config.onBeforeTracking!({
                txHash: TX_HASH,
                originChainId: ORIGIN_CHAIN_ID,
            });
            expect(mockPost).toHaveBeenCalledWith(INDEX_ENDPOINT, {
                chainId: String(ORIGIN_CHAIN_ID),
                txHash: TX_HASH,
            });
        });

        it("onBeforeTracking propagates errors from the API", async () => {
            mockPost.mockRejectedValue(
                makeAxiosError(
                    { message: "Not found" },
                    HTTP_STATUS_BAD_REQUEST,
                    "Request failed",
                    "ERR_BAD_REQUEST",
                ),
            );
            const config = provider.getTrackingConfig();
            await expect(
                config.onBeforeTracking!({ txHash: TX_HASH, originChainId: ORIGIN_CHAIN_ID }),
            ).rejects.toThrow();
        });
    });

    describe("getDiscoveryConfig()", () => {
        it("returns relay config type", () => {
            const config = new RelayProvider().getDiscoveryConfig();
            expect(config).not.toBeNull();
            expect(config!.type).toBe("relay");
        });

        it("includes baseUrl in config", () => {
            const config = new RelayProvider().getDiscoveryConfig();
            if (config!.type === "relay") {
                expect(config!.config.baseUrl).toBe(RELAY_BASE_URL);
            }
        });

        it("uses custom baseUrl when configured", () => {
            const customUrl = "https://custom.relay.link";
            const config = new RelayProvider({ baseUrl: customUrl }).getDiscoveryConfig();
            if (config!.type === "relay") {
                expect(config!.config.baseUrl).toBe(customUrl);
            }
        });

        it("passes API key headers to discovery config", () => {
            const config = new RelayProvider({ apiKey: API_KEY }).getDiscoveryConfig();
            if (config!.type === "relay") {
                expect(config!.config.headers).toEqual({ "x-api-key": API_KEY });
            }
        });

        it("omits headers when no API key is configured", () => {
            const config = new RelayProvider().getDiscoveryConfig();
            if (config!.type === "relay") {
                expect(config!.config.headers).toBeUndefined();
            }
        });
    });

    describe("factory integration", () => {
        it("creates RelayAssetDiscoveryService from RelayProvider config", () => {
            const service = new AssetDiscoveryFactory().createService(new RelayProvider());
            expect(service).toBeInstanceOf(RelayAssetDiscoveryService);
        });

        it("starts prefetching on creation", () => {
            const prefetchSpy = vi.spyOn(RelayAssetDiscoveryService.prototype, "prefetch");
            new AssetDiscoveryFactory().createService(new RelayProvider());
            expect(prefetchSpy).toHaveBeenCalledOnce();
            prefetchSpy.mockRestore();
        });
    });
});
