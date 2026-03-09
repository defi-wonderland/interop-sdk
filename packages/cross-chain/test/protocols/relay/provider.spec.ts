import axios, { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { QuoteRequest } from "../../../src/core/schemas/quoteRequest.js";
import type {
    RelayIntentStatusResponse,
    RelayQuoteResponse,
} from "../../../src/protocols/relay/schemas.js";
import { ProviderGetQuoteFailure } from "../../../src/core/errors/ProviderGetQuoteFailure.exception.js";
import { ProviderGetStatusFailure } from "../../../src/core/errors/ProviderGetStatusFailure.exception.js";
import { OrderFailureReason, OrderStatus } from "../../../src/core/types/orderTracking.js";
import { RelayProvider } from "../../../src/protocols/relay/provider.js";

// ── Constants ────────────────────────────────────────────

const VALID_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const RECIPIENT_ADDRESS = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
const ORIGIN_CHAIN_ID = 1;
const DESTINATION_CHAIN_ID = 10;
const INPUT_AMOUNT = "1000000";
const OUTPUT_AMOUNT = "999000";
const EXACT_OUTPUT_AMOUNT = "500000";
const TX_DATA = "0xdeadbeef";
const REQUEST_ID = "0xreq123";
const ORDER_ID = "0xorder456";
const TIME_ESTIMATE_SECONDS = 30;
const ZERO_AMOUNT = "0";
const PROTOCOL_NAME = "relay";
const QUOTE_ENDPOINT = "/quote/v2";
const STATUS_ENDPOINT = "/intents/status/v3";
const SAMPLE_GAS = "21000";
const SAMPLE_MAX_FEE_PER_GAS = "30000000000";
const SAMPLE_MAX_PRIORITY_FEE_PER_GAS = "1000000000";
const SAMPLE_TIMESTAMP = 1700000000;
const SAMPLE_FILL_TX_HASH = "0xfillhash";
const STEP_DESCRIPTION = "Approve and send";
const API_KEY = "test-key";
const HTTP_STATUS_BAD_REQUEST = 400;
const RELAY_ERROR_AMOUNT_TOO_LOW = "AMOUNT_TOO_LOW";
const RELAY_ERROR_ROUTE_NOT_FOUND = "ROUTE_NOT_FOUND";

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
        fees: {
            gas: {
                currency: {
                    chainId: ORIGIN_CHAIN_ID,
                    address: VALID_ADDRESS,
                    symbol: "ETH",
                    name: "Ether",
                    decimals: 18,
                },
                amount: "100000",
            },
        },
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
                    headers: expect.objectContaining({ "x-api-key": API_KEY }),
                }),
            );
        });
    });

    describe("getQuotes()", () => {
        it("maps Relay response to SDK Quote with all fields", async () => {
            mockPost.mockResolvedValue({ data: makeRelayQuoteResponse() });
            const [quote] = await provider.getQuotes(makeQuoteRequest());
            expect(quote!.provider).toBe(PROTOCOL_NAME);
            expect(quote!.quoteId).toBe(ORDER_ID);
            expect(quote!.eta).toBe(TIME_ESTIMATE_SECONDS);
            expect(quote!.partialFill).toBe(false);
            expect(quote!.failureHandling).toBe("refund-automatic");
            expect(quote!.metadata!.relayResponse).toBeDefined();
            expect(quote!.preview.inputs[0]!.accountAddress).toBe(VALID_ADDRESS);
            expect(quote!.preview.inputs[0]!.amount).toBe(INPUT_AMOUNT);
            expect(quote!.preview.outputs[0]!.amount).toBe(OUTPUT_AMOUNT);
        });

        it("maps transaction steps with description and tx data", async () => {
            mockPost.mockResolvedValue({ data: makeRelayQuoteResponse() });
            const [quote] = await provider.getQuotes(makeQuoteRequest());
            expect(quote!.order.steps).toHaveLength(1);
            const step = quote!.order.steps[0]!;
            expect(step.kind).toBe("transaction");
            if (step.kind === "transaction") {
                expect(step.description).toBe(STEP_DESCRIPTION);
                expect(step.transaction.to).toBe(VALID_ADDRESS);
                expect(step.transaction.data).toBe(TX_DATA);
            }
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

        it("maps exact-output to EXPECTED_OUTPUT trade type", async () => {
            mockPost.mockResolvedValue({ data: makeRelayQuoteResponse() });
            await provider.getQuotes(
                makeQuoteRequest({
                    swapType: "exact-output",
                    input: { chainId: ORIGIN_CHAIN_ID, assetAddress: VALID_ADDRESS },
                    output: {
                        chainId: DESTINATION_CHAIN_ID,
                        assetAddress: VALID_ADDRESS,
                        amount: EXACT_OUTPUT_AMOUNT,
                    },
                }),
            );
            expect(mockPost).toHaveBeenCalledWith(
                QUOTE_ENDPOINT,
                expect.objectContaining({
                    tradeType: "EXPECTED_OUTPUT",
                    amount: EXACT_OUTPUT_AMOUNT,
                }),
            );
        });

        it("sets outputs accountAddress to recipient when provided", async () => {
            mockPost.mockResolvedValue({ data: makeRelayQuoteResponse() });
            const [quote] = await provider.getQuotes(
                makeQuoteRequest({
                    output: {
                        chainId: DESTINATION_CHAIN_ID,
                        assetAddress: VALID_ADDRESS,
                        recipient: RECIPIENT_ADDRESS,
                    },
                }),
            );
            expect(quote!.preview.outputs[0]!.accountAddress).toBe(RECIPIENT_ADDRESS);
        });

        it("throws when exact-input request has no input amount", async () => {
            const params = makeQuoteRequest({
                input: { chainId: ORIGIN_CHAIN_ID, assetAddress: VALID_ADDRESS },
            });
            await expect(provider.getQuotes(params)).rejects.toThrow(
                "exact-input requires input.amount to be defined",
            );
        });

        it("throws when exact-output request has no output amount", async () => {
            const params = makeQuoteRequest({
                swapType: "exact-output",
                input: { chainId: ORIGIN_CHAIN_ID, assetAddress: VALID_ADDRESS },
                output: { chainId: DESTINATION_CHAIN_ID, assetAddress: VALID_ADDRESS },
            });
            await expect(provider.getQuotes(params)).rejects.toThrow(
                "exact-output requires output.amount to be defined",
            );
        });

        it("falls back to request params when details is missing", async () => {
            mockPost.mockResolvedValue({ data: makeRelayQuoteResponse({ details: undefined }) });
            const [quote] = await provider.getQuotes(makeQuoteRequest());
            expect(quote!.eta).toBeUndefined();
            expect(quote!.preview.inputs[0]!.amount).toBe(INPUT_AMOUNT);
            expect(quote!.preview.inputs[0]!.chainId).toBe(ORIGIN_CHAIN_ID);
            expect(quote!.preview.outputs[0]!.amount).toBe(ZERO_AMOUNT);
            expect(quote!.preview.outputs[0]!.chainId).toBe(DESTINATION_CHAIN_ID);
        });

        it("uses currencyIn from response for exact-output input preview", async () => {
            mockPost.mockResolvedValue({ data: makeRelayQuoteResponse() });
            const [quote] = await provider.getQuotes(
                makeQuoteRequest({
                    swapType: "exact-output",
                    input: { chainId: ORIGIN_CHAIN_ID, assetAddress: VALID_ADDRESS },
                    output: {
                        chainId: DESTINATION_CHAIN_ID,
                        assetAddress: VALID_ADDRESS,
                        amount: EXACT_OUTPUT_AMOUNT,
                    },
                }),
            );
            expect(quote!.preview.inputs[0]!.amount).toBe(INPUT_AMOUNT);
        });

        it("falls back input amount to '0' when no details and no input amount", async () => {
            mockPost.mockResolvedValue({ data: makeRelayQuoteResponse({ details: undefined }) });
            const [quote] = await provider.getQuotes(
                makeQuoteRequest({
                    swapType: "exact-output",
                    input: { chainId: ORIGIN_CHAIN_ID, assetAddress: VALID_ADDRESS },
                    output: {
                        chainId: DESTINATION_CHAIN_ID,
                        assetAddress: VALID_ADDRESS,
                        amount: EXACT_OUTPUT_AMOUNT,
                    },
                }),
            );
            expect(quote!.preview.inputs[0]!.amount).toBe(ZERO_AMOUNT);
        });

        it("sets quoteId to undefined when protocol.v2 is missing", async () => {
            mockPost.mockResolvedValue({ data: makeRelayQuoteResponse({ protocol: undefined }) });
            const [quote] = await provider.getQuotes(makeQuoteRequest());
            expect(quote!.quoteId).toBeUndefined();
        });

        it("filters out complete items and keeps only incomplete ones", async () => {
            const step = makeRelayQuoteResponse().steps[0]!;
            const items = [
                { ...step.items[0]!, status: "complete" as const },
                { ...step.items[0]!, status: "incomplete" as const },
            ];
            mockPost.mockResolvedValue({
                data: makeRelayQuoteResponse({ steps: [{ ...step, items }] }),
            });
            const [quote] = await provider.getQuotes(makeQuoteRequest());
            expect(quote!.order.steps).toHaveLength(1);
        });

        it("maps multiple incomplete items from a single step into separate Steps", async () => {
            const step = makeRelayQuoteResponse().steps[0]!;
            const items = [
                step.items[0]!,
                {
                    ...step.items[0]!,
                    data: { ...step.items[0]!.data, chainId: DESTINATION_CHAIN_ID },
                },
            ];
            mockPost.mockResolvedValue({
                data: makeRelayQuoteResponse({ steps: [{ ...step, items }] }),
            });
            const [quote] = await provider.getQuotes(makeQuoteRequest());
            expect(quote!.order.steps).toHaveLength(2);
        });

        it("skips signature steps", async () => {
            const txStep = makeRelayQuoteResponse().steps[0]!;
            const sigStep = {
                ...txStep,
                id: "authorize" as const,
                kind: "signature" as const,
                items: [{ status: "incomplete" as const, data: {} }],
            };
            mockPost.mockResolvedValue({
                data: makeRelayQuoteResponse({ steps: [sigStep, txStep] }),
            });
            const [quote] = await provider.getQuotes(makeQuoteRequest());
            expect(quote!.order.steps).toHaveLength(1);
            expect(quote!.order.steps[0]!.kind).toBe("transaction");
        });

        it("maps gas parameters when present", async () => {
            const step = makeRelayQuoteResponse().steps[0]!;
            const itemWithGas = {
                ...step.items[0]!,
                data: {
                    ...step.items[0]!.data,
                    gas: SAMPLE_GAS,
                    maxFeePerGas: SAMPLE_MAX_FEE_PER_GAS,
                    maxPriorityFeePerGas: SAMPLE_MAX_PRIORITY_FEE_PER_GAS,
                },
            };
            mockPost.mockResolvedValue({
                data: makeRelayQuoteResponse({ steps: [{ ...step, items: [itemWithGas] }] }),
            });
            const [quote] = await provider.getQuotes(makeQuoteRequest());
            const s = quote!.order.steps[0]!;
            if (s.kind === "transaction") {
                expect(s.transaction.gas).toBe(SAMPLE_GAS);
                expect(s.transaction.maxFeePerGas).toBe(SAMPLE_MAX_FEE_PER_GAS);
                expect(s.transaction.maxPriorityFeePerGas).toBe(SAMPLE_MAX_PRIORITY_FEE_PER_GAS);
            }
        });

        it("passes slippageTolerance when configured", async () => {
            mockPost.mockResolvedValue({ data: makeRelayQuoteResponse() });
            await new RelayProvider({ slippageTolerance: 50 }).getQuotes(makeQuoteRequest());
            expect(mockPost).toHaveBeenCalledWith(
                QUOTE_ENDPOINT,
                expect.objectContaining({ slippageTolerance: "50" }),
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

    describe("getStatus()", () => {
        it("calls /intents/status/v3 and parses response", async () => {
            mockGet.mockResolvedValue({
                data: { status: "success", txHashes: [SAMPLE_FILL_TX_HASH] },
            });
            const result = await provider.getStatus({ requestId: REQUEST_ID });
            expect(mockGet).toHaveBeenCalledWith(STATUS_ENDPOINT, {
                params: { requestId: REQUEST_ID },
            });
            expect(result.status).toBe("success");
            expect(result.txHashes).toEqual([SAMPLE_FILL_TX_HASH]);
        });

        it("throws on invalid status value", async () => {
            mockGet.mockResolvedValue({ data: { status: "invalid-status" } });
            await expect(provider.getStatus({ requestId: REQUEST_ID })).rejects.toThrow();
        });

        it("throws ProviderGetStatusFailure on API error", async () => {
            mockGet.mockRejectedValue(new AxiosError("Network Error"));
            await expect(provider.getStatus({ requestId: REQUEST_ID })).rejects.toThrow(
                ProviderGetStatusFailure,
            );
        });
    });

    describe("getTrackingConfig()", () => {
        it("returns api-based fill watcher and api intent parser", () => {
            const config = provider.getTrackingConfig();
            expect(config.fillWatcherConfig.type).toBe("api-based");
            expect(config.openedIntentParserConfig.type).toBe("api");
        });

        it("extractOpenedIntent maps valid API response to OpenedIntent", () => {
            const { openedIntentParserConfig } = provider.getTrackingConfig();
            if (openedIntentParserConfig.type === "api") {
                const txHash = "0xabc123" as `0x${string}`;
                const inTxHash = "0xorigin111" as `0x${string}`;
                const result = openedIntentParserConfig.config.extractOpenedIntent(
                    {
                        status: "pending",
                        originChainId: 11155111,
                        destinationChainId: 84532,
                        inTxHashes: [inTxHash],
                    },
                    txHash,
                );
                expect(result.orderId).toBe(txHash);
                expect(result.txHash).toBe(inTxHash);
                expect(result.originChainId).toBe(11155111);
                expect(result.fillInstructions).toHaveLength(1);
                expect(result.fillInstructions[0]?.destinationChainId).toBe(84532);
            }
        });

        it("extractOpenedIntent falls back to txHash when inTxHashes is empty", () => {
            const { openedIntentParserConfig } = provider.getTrackingConfig();
            if (openedIntentParserConfig.type === "api") {
                const txHash = "0xabc123" as `0x${string}`;
                const result = openedIntentParserConfig.config.extractOpenedIntent(
                    { status: "pending", originChainId: 11155111 },
                    txHash,
                );
                expect(result.txHash).toBe(txHash);
                expect(result.fillInstructions).toHaveLength(0);
            }
        });

        it("extractOpenedIntent throws OpenedIntentNotFoundError on invalid response", () => {
            const { openedIntentParserConfig } = provider.getTrackingConfig();
            if (openedIntentParserConfig.type === "api") {
                expect(() =>
                    openedIntentParserConfig.config.extractOpenedIntent(
                        { invalid: "data" },
                        "0x123" as `0x${string}`,
                    ),
                ).toThrow("relay opened intent event not found");
            }
        });

        it("buildEndpoint includes requestId", () => {
            const { fillWatcherConfig } = provider.getTrackingConfig();
            if (fillWatcherConfig.type === "api-based") {
                const endpoint = fillWatcherConfig.buildEndpoint({
                    orderId: ORDER_ID,
                    originChainId: ORIGIN_CHAIN_ID,
                } as never);
                expect(endpoint).toContain(`requestId=${ORDER_ID}`);
            }
        });
    });

    describe("extractFillEvent()", () => {
        const fillParams = {
            orderId: ORDER_ID,
            originChainId: ORIGIN_CHAIN_ID,
            openTxHash: "0xtx",
        } as never;

        function getExtract(): typeof config.extractFillEvent {
            const { fillWatcherConfig } = provider.getTrackingConfig();
            const config = fillWatcherConfig as {
                type: "api-based";
                extractFillEvent: (
                    r: RelayIntentStatusResponse,
                    p: never,
                ) => { event: unknown; status: OrderStatus; failureReason?: OrderFailureReason };
            };
            return config.extractFillEvent;
        }

        it("maps 'success' with txHashes to Finalized with FillEvent", () => {
            const response: RelayIntentStatusResponse = {
                status: "success",
                txHashes: [SAMPLE_FILL_TX_HASH],
                updatedAt: SAMPLE_TIMESTAMP,
            };
            const result = getExtract()(response, fillParams);
            expect(result.status).toBe(OrderStatus.Finalized);
            expect(result.event).not.toBeNull();
        });

        it("returns null event when success has no txHashes", () => {
            const extract = getExtract();
            expect(extract({ status: "success" }, fillParams).event).toBeNull();
            expect(extract({ status: "success", txHashes: [] }, fillParams).event).toBeNull();
        });

        it("maps 'failure' to Failed with Unknown reason", () => {
            const result = getExtract()({ status: "failure" }, fillParams);
            expect(result.status).toBe(OrderStatus.Failed);
            expect(result.failureReason).toBe(OrderFailureReason.Unknown);
            expect(result.event).toBeNull();
        });

        it("maps 'refund' to Refunded", () => {
            const result = getExtract()({ status: "refund" }, fillParams);
            expect(result.status).toBe(OrderStatus.Refunded);
            expect(result.event).toBeNull();
        });

        it.each(["waiting", "pending", "submitted"] as const)("maps '%s' to Pending", (status) => {
            const result = getExtract()({ status }, fillParams);
            expect(result.status).toBe(OrderStatus.Pending);
            expect(result.event).toBeNull();
        });
    });
});
