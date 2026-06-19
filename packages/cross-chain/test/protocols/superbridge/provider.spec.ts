import { beforeEach, describe, expect, it, vi } from "vitest";

import type { HttpClient } from "../../../src/core/interfaces/httpClient.interface.js";
import type { QuoteRequest } from "../../../src/core/schemas/quoteRequest.js";
import { PERMIT2_ADDRESS } from "../../../src/core/constants/eip712.js";
import { ProviderConfigFailure } from "../../../src/core/errors/ProviderConfigFailure.exception.js";
import { ProviderGetQuoteFailure } from "../../../src/core/errors/ProviderGetQuoteFailure.exception.js";
import { FetchHttpClient } from "../../../src/core/utils/httpClient.js";
import { SuperbridgeProvider } from "../../../src/protocols/superbridge/provider.js";

const VALID_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const NATIVE = "0x0000000000000000000000000000000000000000";
const ERC20_TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const GASLESS_SPENDER = "0x1111111111111111111111111111111111111111";
const FUTURE_DEADLINE = Math.floor(Date.now() / 1000) + 3600;
const ORIGIN_CHAIN_ID = 1;
const DESTINATION_CHAIN_ID = 8453;
const INPUT_AMOUNT = "10000000000000000";
const OUTPUT_AMOUNT = "9990000000000000";
const TX_DATA = "0xdeadbeef";
const FILL_TX_HASH = "0xabc1230000000000000000000000000000000000000000000000000000000000";
const PROTOCOL_NAME = "superbridge";
const API_KEY = "sb-test-key";

vi.mock("../../../src/core/utils/httpClient.js", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../../src/core/utils/httpClient.js")>();
    return { ...actual, FetchHttpClient: vi.fn() };
});

const mockPost = vi.fn();
const mockGet = vi.fn();

function makeQuoteRequest(overrides?: Partial<QuoteRequest>): QuoteRequest {
    return {
        user: VALID_ADDRESS,
        input: { chainId: ORIGIN_CHAIN_ID, assetAddress: NATIVE, amount: INPUT_AMOUNT },
        output: { chainId: DESTINATION_CHAIN_ID, assetAddress: NATIVE },
        ...overrides,
    };
}

function makeEvmRouteResult(): unknown {
    return {
        result: {
            id: "route-1",
            provider: { name: "across-v3" },
            initiatingTransaction: {
                type: "evm",
                chainId: String(ORIGIN_CHAIN_ID),
                to: VALID_ADDRESS,
                data: TX_DATA,
                value: INPUT_AMOUNT,
            },
            fromToken: {
                address: NATIVE,
                chainId: String(ORIGIN_CHAIN_ID),
                symbol: "ETH",
                decimals: 18,
            },
            toToken: {
                address: NATIVE,
                chainId: String(DESTINATION_CHAIN_ID),
                symbol: "ETH",
                decimals: 18,
            },
            fromAmount: INPUT_AMOUNT,
            receiveAmount: OUTPUT_AMOUNT,
            duration: 60,
            fees: [
                {
                    items: [
                        {
                            name: "Bridge fee",
                            amount: "5000",
                            token: { address: NATIVE, chainId: "1", symbol: "ETH", decimals: 18 },
                        },
                    ],
                },
            ],
        },
    };
}

function makeGaslessRouteResult(): unknown {
    const typedData = JSON.stringify({
        domain: { name: "Permit2", chainId: ORIGIN_CHAIN_ID, verifyingContract: PERMIT2_ADDRESS },
        types: {
            PermitTransferFrom: [
                { name: "permitted", type: "TokenPermissions" },
                { name: "spender", type: "address" },
                { name: "nonce", type: "uint256" },
                { name: "deadline", type: "uint256" },
            ],
        },
        primaryType: "PermitTransferFrom",
        message: {
            permitted: { token: ERC20_TOKEN, amount: INPUT_AMOUNT },
            spender: GASLESS_SPENDER,
            nonce: "1",
            deadline: FUTURE_DEADLINE,
        },
    });
    return {
        meta: { id: "route-gasless", provider: { name: "across-v3" } },
        result: {
            initiatingTransaction: {
                type: "evm-gasless",
                chainId: String(ORIGIN_CHAIN_ID),
                typedData,
            },
        },
    };
}

function httpOk(data: unknown): { status: number; data: unknown; headers: Headers } {
    return { status: 200, data, headers: new Headers() };
}

describe("SuperbridgeProvider", () => {
    let provider: SuperbridgeProvider;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(FetchHttpClient).mockImplementation(function (this: HttpClient) {
            (this as unknown as { get: typeof mockGet; post: typeof mockPost }).get = mockGet;
            (this as unknown as { get: typeof mockGet; post: typeof mockPost }).post = mockPost;
        } as unknown as typeof FetchHttpClient);
        provider = new SuperbridgeProvider({ apiKey: API_KEY });
    });

    describe("constructor", () => {
        it("uses default config when only an api key is provided", () => {
            expect(provider.protocolName).toBe(PROTOCOL_NAME);
            expect(provider.providerId).toBe(PROTOCOL_NAME);
        });

        it("accepts a custom provider id", () => {
            expect(
                new SuperbridgeProvider({ providerId: "sb-custom", apiKey: API_KEY }).providerId,
            ).toBe("sb-custom");
        });

        it("rejects an invalid base url", () => {
            expect(
                () => new SuperbridgeProvider({ baseUrl: "not-a-url", apiKey: API_KEY }),
            ).toThrow(ProviderConfigFailure);
        });

        it("rejects a missing api key", () => {
            expect(() => new SuperbridgeProvider({ apiKey: "" })).toThrow(ProviderConfigFailure);
        });
    });

    describe("getQuotes()", () => {
        it("returns a transaction quote for an evm route", async () => {
            mockPost.mockResolvedValue(httpOk({ results: [makeEvmRouteResult()] }));

            const quotes = await provider.getQuotes(makeQuoteRequest());

            expect(quotes).toHaveLength(1);
            expect(quotes[0]!.provider).toBe(PROTOCOL_NAME);
            expect(quotes[0]!.order.steps[0]!.kind).toBe("transaction");
            expect(quotes[0]!.eta).toBe(60);
            expect(quotes[0]!.fees?.bridgeFee?.amount).toBe("5000");
        });

        it("throws when every route requires a submission mode that is not enabled", async () => {
            mockPost.mockResolvedValue(httpOk({ results: [makeGaslessRouteResult()] }));

            await expect(provider.getQuotes(makeQuoteRequest())).rejects.toBeInstanceOf(
                ProviderGetQuoteFailure,
            );
        });

        it("returns a signature quote when gasless mode is enabled", async () => {
            const gaslessProvider = new SuperbridgeProvider({
                submissionModes: ["gasless"],
                apiKey: API_KEY,
            });
            mockPost.mockResolvedValue(httpOk({ results: [makeGaslessRouteResult()] }));

            const quotes = await gaslessProvider.getQuotes(
                makeQuoteRequest({
                    input: {
                        chainId: ORIGIN_CHAIN_ID,
                        assetAddress: ERC20_TOKEN,
                        amount: INPUT_AMOUNT,
                    },
                }),
            );

            expect(quotes).toHaveLength(1);
            expect(quotes[0]!.order.steps[0]!.kind).toBe("signature");
        });

        it("prepends an approval step for erc-20 routes", async () => {
            const result = makeEvmRouteResult();
            (result as { result: Record<string, unknown> }).result.tokenApproval = {
                contractAddress: VALID_ADDRESS,
                tokenAddress: VALID_ADDRESS,
                amount: INPUT_AMOUNT,
                tx: { type: "evm", chainId: "1", to: VALID_ADDRESS, data: "0xapprove" },
            };
            mockPost.mockResolvedValue(httpOk({ results: [result] }));

            const quotes = await provider.getQuotes(makeQuoteRequest());

            expect(quotes[0]!.order.steps).toHaveLength(2);
            expect(quotes[0]!.order.steps[0]!.kind).toBe("transaction");
            expect(quotes[0]!.order.steps[0]!.category).toBe("approval");
        });

        it("wraps unexpected errors in ProviderGetQuoteFailure", async () => {
            mockPost.mockRejectedValue(new Error("boom"));

            await expect(provider.getQuotes(makeQuoteRequest())).rejects.toBeInstanceOf(
                ProviderGetQuoteFailure,
            );
        });
    });

    describe("submitOrder()", () => {
        it("submits a gasless signature and returns the tx hash", async () => {
            const gaslessProvider = new SuperbridgeProvider({
                submissionModes: ["gasless"],
                apiKey: API_KEY,
            });
            mockPost.mockResolvedValueOnce(httpOk({ results: [makeGaslessRouteResult()] }));
            const [quote] = await gaslessProvider.getQuotes(
                makeQuoteRequest({
                    input: {
                        chainId: ORIGIN_CHAIN_ID,
                        assetAddress: ERC20_TOKEN,
                        amount: INPUT_AMOUNT,
                    },
                }),
            );

            mockPost.mockResolvedValueOnce(httpOk({ txHash: FILL_TX_HASH, status: "submitted" }));
            const response = await gaslessProvider.submitOrder(quote!, "0xsignature");

            expect(response.orderId).toBe(FILL_TX_HASH);
            expect(response.status).toBe("submitted");
        });
    });

    describe("getTrackingConfig()", () => {
        it("builds activity-based tracking and index pre-tracker", () => {
            const config = provider.getTrackingConfig();

            expect(config.openedIntentParserConfig.type).toBe("api");
            expect(config.preTrackerConfig.type).toBe("api");
            expect(config.preTrackerConfig.buildUrl()).toContain("/v1/index_transaction");
            expect(
                config.preTrackerConfig.buildBody({ txHash: FILL_TX_HASH, originChainId: 1 }),
            ).toEqual({ txHash: FILL_TX_HASH, chainId: "1" });
        });
    });

    describe("getDiscoveryConfig()", () => {
        it("returns a custom-api discovery config", () => {
            const config = provider.getDiscoveryConfig();

            expect(config.type).toBe("custom-api");
            if (config.type === "custom-api") {
                expect(config.config.assetsEndpoint).toContain("/v1/tokens");
            }
        });
    });
});
