import { describe, expect, it } from "vitest";

import type { SubmissionMode } from "../../../../src/core/schemas/providerConfig.js";
import type { QuoteRequest } from "../../../../src/core/schemas/quoteRequest.js";
import type {
    SuperbridgeRouteResult,
    SuperbridgeRoutesResponse,
} from "../../../../src/protocols/superbridge/schemas.js";
import { ProviderGetQuoteFailure } from "../../../../src/core/errors/ProviderGetQuoteFailure.exception.js";
import { adaptQuoteResponse } from "../../../../src/protocols/superbridge/adapters/quoteResponseAdapter.js";

const USER = "0x1234567890abcdef1234567890abcdef12345678";
const TO = "0x1111111111111111111111111111111111111111";
const RECEIVE_TOKEN = "0x2222222222222222222222222222222222222222";
const PROVIDER_ID = "superbridge";

function request(): QuoteRequest {
    return {
        user: USER,
        input: { chainId: 1, assetAddress: TO, amount: "1000" },
        output: { chainId: 8453, assetAddress: TO },
    };
}

function evmResult(): SuperbridgeRouteResult {
    return {
        meta: { id: "route-1", provider: { name: "across-v3" } },
        result: {
            initiatingTransaction: {
                type: "evm",
                chainId: "1",
                to: TO,
                data: "0xfeed",
                value: "1000",
            },
            token: { address: TO, chainId: "uuid-from", symbol: "USDC", decimals: 6 },
            receiveToken: {
                address: RECEIVE_TOKEN,
                chainId: "uuid-to",
                symbol: "USDbC",
                decimals: 6,
            },
            receive: "995",
            duration: 42,
        },
    };
}

function gaslessResult(): SuperbridgeRouteResult {
    return {
        meta: { id: "route-gasless" },
        result: {
            initiatingTransaction: {
                type: "evm-gasless",
                chainId: "1",
                typedData: JSON.stringify({
                    domain: { chainId: 1 },
                    types: { Order: [{ name: "a", type: "uint256" }] },
                    primaryType: "Order",
                    message: { a: "1" },
                }),
            },
        },
    };
}

function response(results: SuperbridgeRouteResult[]): SuperbridgeRoutesResponse {
    return { results };
}

const userTxModes: ReadonlySet<SubmissionMode> = new Set(["user-transaction"]);
const gaslessModes: ReadonlySet<SubmissionMode> = new Set(["gasless"]);

describe("adaptQuoteResponse", () => {
    it("maps an evm route to a transaction quote", () => {
        const quotes = adaptQuoteResponse(
            response([evmResult()]),
            PROVIDER_ID,
            request(),
            userTxModes,
        );

        expect(quotes).toHaveLength(1);
        expect(quotes[0]!.order.steps[0]!.kind).toBe("transaction");
        expect(quotes[0]!.eta).toBe(42);
        expect(quotes[0]!.metadata?.superbridgeRouteId).toBe("route-1");
        expect(quotes[0]!.metadata?.superbridgeProvider).toBe("across-v3");
    });

    it("maps token, receiveToken and receive into the preview with numeric chain ids", () => {
        const quotes = adaptQuoteResponse(
            response([evmResult()]),
            PROVIDER_ID,
            request(),
            userTxModes,
        );

        const { inputs, outputs } = quotes[0]!.preview;
        expect(inputs[0]!.chainId).toBe(1);
        expect(inputs[0]!.assetAddress).toBe(TO);
        expect(inputs[0]!.amount).toBe("1000");
        expect(outputs[0]!.chainId).toBe(8453);
        expect(outputs[0]!.assetAddress).toBe(RECEIVE_TOKEN);
        expect(outputs[0]!.amount).toBe("995");
    });

    it("derives eta from wait step durations when duration is absent", () => {
        const result = evmResult();
        const quote = result.result as Record<string, unknown>;
        delete quote.duration;
        quote.steps = [
            { type: "transaction", action: "Initiate" },
            { type: "wait", waitType: "op-dispute-game", expectedDuration: 2052000 },
            { type: "wait", waitType: "op-challenge-period", expectedDuration: 604800000 },
        ];

        const quotes = adaptQuoteResponse(response([result]), PROVIDER_ID, request(), userTxModes);

        expect(quotes[0]!.eta).toBe(606852);
    });

    it("skips error variants without an initiating transaction", () => {
        const errorResult: SuperbridgeRouteResult = { result: { code: "AMOUNT_TOO_LARGE" } };
        const quotes = adaptQuoteResponse(
            response([errorResult]),
            PROVIDER_ID,
            request(),
            userTxModes,
        );

        expect(quotes).toHaveLength(0);
    });

    it("throws when every route requires a submission mode that is not enabled", () => {
        expect(() =>
            adaptQuoteResponse(response([gaslessResult()]), PROVIDER_ID, request(), userTxModes),
        ).toThrow(ProviderGetQuoteFailure);
    });

    it("returns matching quotes and ignores routes for other submission modes", () => {
        const quotes = adaptQuoteResponse(
            response([evmResult(), gaslessResult()]),
            PROVIDER_ID,
            request(),
            userTxModes,
        );

        expect(quotes).toHaveLength(1);
        expect(quotes[0]!.order.steps[0]!.kind).toBe("transaction");
    });

    it("maps a gasless route to a signature quote when enabled", () => {
        const quotes = adaptQuoteResponse(
            response([gaslessResult()]),
            PROVIDER_ID,
            request(),
            gaslessModes,
        );

        expect(quotes).toHaveLength(1);
        expect(quotes[0]!.order.steps[0]!.kind).toBe("signature");
    });

    it("skips a gasless route that carries invalid typed data", () => {
        const result: SuperbridgeRouteResult = {
            meta: { id: "route-gasless" },
            result: {
                initiatingTransaction: {
                    type: "evm-gasless",
                    chainId: "1",
                    typedData: "not-valid-json",
                },
            },
        };

        const quotes = adaptQuoteResponse(response([result]), PROVIDER_ID, request(), gaslessModes);

        expect(quotes).toHaveLength(0);
    });

    it("skips a gasless route that is missing the route id", () => {
        const result: SuperbridgeRouteResult = { result: gaslessResult().result };

        const quotes = adaptQuoteResponse(response([result]), PROVIDER_ID, request(), gaslessModes);

        expect(quotes).toHaveLength(0);
    });

    it("prepends revoke and approval steps in order", () => {
        const result = evmResult();
        const quote = result.result as Record<string, unknown>;
        quote.revokeTokenApproval = {
            contractAddress: TO,
            tokenAddress: TO,
            tx: { type: "evm", chainId: "1", to: TO, data: "0xrevoke" },
        };
        quote.tokenApproval = {
            contractAddress: TO,
            tokenAddress: TO,
            tx: { type: "evm", chainId: "1", to: TO, data: "0xapprove" },
        };

        const quotes = adaptQuoteResponse(response([result]), PROVIDER_ID, request(), userTxModes);

        expect(quotes[0]!.order.steps).toHaveLength(3);
        expect(quotes[0]!.order.steps[0]!.category).toBe("approval");
        expect(quotes[0]!.order.steps[2]!.kind).toBe("transaction");
    });

    it("maps a gas fee to originGas and a non-gas fee to bridgeFee", () => {
        const result = evmResult();
        const token = { address: TO, chainId: "1", symbol: "ETH", decimals: 18 };
        (result.result as Record<string, unknown>).fees = [
            { items: [{ name: "Gas fee", amount: "100", token }] },
            { items: [{ name: "Bridge fee", amount: "200", token }] },
        ];

        const quotes = adaptQuoteResponse(response([result]), PROVIDER_ID, request(), userTxModes);

        expect(quotes[0]!.fees?.originGas?.amount).toBe("100");
        expect(quotes[0]!.fees?.bridgeFee?.amount).toBe("200");
    });

    it("omits fees when the route has none", () => {
        const quotes = adaptQuoteResponse(
            response([evmResult()]),
            PROVIDER_ID,
            request(),
            userTxModes,
        );

        expect(quotes[0]!.fees).toBeUndefined();
    });
});
