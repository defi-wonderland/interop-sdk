import axios, { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { QuoteRequest } from "../../../src/core/schemas/quoteRequest.js";
import type { CustomApiAssetDiscoveryConfig, NetworkAssets } from "../../../src/internal.js";
import type { RelayQuoteResponse } from "../../../src/protocols/relay/schemas.js";
import { ProviderGetQuoteFailure } from "../../../src/core/errors/ProviderGetQuoteFailure.exception.js";
import { AssetDiscoveryFactory, CustomApiAssetDiscoveryService } from "../../../src/internal.js";
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
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDC_POLYGON_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const ETHEREUM_CHAIN_ID = 1;
const POLYGON_CHAIN_ID = 137;
const USDC_DECIMALS = 6;
const WETH_DECIMALS = 18;

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

function getCustomApiConfig(provider: RelayProvider): CustomApiAssetDiscoveryConfig["config"] {
    const config = provider.getDiscoveryConfig();
    if (!config || config.type !== "custom-api") {
        throw new Error(`Expected custom-api config, got ${config?.type ?? "null"}`);
    }
    return config.config;
}

function makeCurrencyEntry(
    chainId: number,
    address: string,
    symbol: string,
    decimals: number,
): Record<string, unknown> {
    return { chainId, address, symbol, name: `${symbol} Token`, decimals };
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
        it("returns custom-api config type", () => {
            const config = new RelayProvider().getDiscoveryConfig();
            expect(config).not.toBeNull();
            expect(config!.type).toBe("custom-api");
        });

        it("uses default base URL for assets endpoint", () => {
            const apiConfig = getCustomApiConfig(new RelayProvider());
            expect(apiConfig.assetsEndpoint).toBe("https://api.relay.link/currencies/v2");
        });

        it("uses custom baseUrl when provided", () => {
            const apiConfig = getCustomApiConfig(
                new RelayProvider({ baseUrl: "https://custom.relay.link" }),
            );
            expect(apiConfig.assetsEndpoint).toBe("https://custom.relay.link/currencies/v2");
        });
    });

    describe("parseCurrenciesResponse()", () => {
        const { parseResponse } = getCustomApiConfig(new RelayProvider());

        it("groups currencies by chain", () => {
            const mockCurrencies = [
                makeCurrencyEntry(ETHEREUM_CHAIN_ID, USDC_ADDRESS, "USDC", USDC_DECIMALS),
                makeCurrencyEntry(ETHEREUM_CHAIN_ID, WETH_ADDRESS, "WETH", WETH_DECIMALS),
                makeCurrencyEntry(POLYGON_CHAIN_ID, USDC_POLYGON_ADDRESS, "USDC", USDC_DECIMALS),
            ];
            const result: NetworkAssets[] = parseResponse(mockCurrencies);
            expect(result).toHaveLength(2);
            const ethereum = result.find((n: NetworkAssets) => n.chainId === ETHEREUM_CHAIN_ID);
            expect(ethereum?.assets).toHaveLength(2);
            const polygon = result.find((n: NetworkAssets) => n.chainId === POLYGON_CHAIN_ID);
            expect(polygon?.assets).toHaveLength(1);
        });

        it("encodes addresses to EIP-7930 format", () => {
            const result: NetworkAssets[] = parseResponse([
                makeCurrencyEntry(ETHEREUM_CHAIN_ID, USDC_ADDRESS, "USDC", USDC_DECIMALS),
            ]);
            const asset = result[0]?.assets[0];
            expect(asset?.address).toMatch(/^0x/);
            expect(asset?.address.length).toBeGreaterThan(42);
        });

        it("handles empty array", () => {
            expect(parseResponse([])).toHaveLength(0);
        });

        it("deduplicates currencies by address on the same chain", () => {
            const mockCurrencies = [
                makeCurrencyEntry(ETHEREUM_CHAIN_ID, USDC_ADDRESS, "USDC", USDC_DECIMALS),
                makeCurrencyEntry(
                    ETHEREUM_CHAIN_ID,
                    USDC_ADDRESS.toLowerCase(),
                    "USDC.e",
                    USDC_DECIMALS,
                ),
            ];
            const result: NetworkAssets[] = parseResponse(mockCurrencies);
            const ethereum = result.find((n: NetworkAssets) => n.chainId === ETHEREUM_CHAIN_ID);
            expect(ethereum?.assets).toHaveLength(1);
            expect(ethereum?.assets[0]?.symbol).toBe("USDC");
        });

        it("preserves symbol and decimals", () => {
            const result: NetworkAssets[] = parseResponse([
                makeCurrencyEntry(ETHEREUM_CHAIN_ID, WETH_ADDRESS, "WETH", WETH_DECIMALS),
            ]);
            const asset = result[0]?.assets[0];
            expect(asset?.symbol).toBe("WETH");
            expect(asset?.decimals).toBe(WETH_DECIMALS);
        });

        it("throws on invalid schema (missing required fields)", () => {
            expect(() => parseResponse([{ chainId: 1, address: USDC_ADDRESS }])).toThrow();
        });

        it("throws on negative chainId", () => {
            expect(() =>
                parseResponse([makeCurrencyEntry(-1, USDC_ADDRESS, "USDC", USDC_DECIMALS)]),
            ).toThrow();
        });
    });

    describe("factory integration", () => {
        it("creates CustomApiAssetDiscoveryService from RelayProvider config", () => {
            const service = new AssetDiscoveryFactory().createService(new RelayProvider());
            expect(service).toBeInstanceOf(CustomApiAssetDiscoveryService);
        });

        it("starts prefetching on creation", () => {
            const prefetchSpy = vi.spyOn(CustomApiAssetDiscoveryService.prototype, "prefetch");
            new AssetDiscoveryFactory().createService(new RelayProvider());
            expect(prefetchSpy).toHaveBeenCalledOnce();
            prefetchSpy.mockRestore();
        });
    });
});
