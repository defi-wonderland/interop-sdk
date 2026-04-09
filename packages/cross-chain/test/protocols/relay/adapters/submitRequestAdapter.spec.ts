import { describe, expect, it } from "vitest";

import type { Quote } from "../../../../src/core/schemas/quote.js";
import { ProviderExecuteFailure } from "../../../../src/core/errors/ProviderExecuteFailure.exception.js";
import { adaptSubmitRequest } from "../../../../src/protocols/relay/adapters/submitRequestAdapter.js";

// ── Constants ────────────────────────────────────────────

const VALID_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const ORIGIN_CHAIN_ID = 1;
const DESTINATION_CHAIN_ID = 10;
const INPUT_AMOUNT = "1000000";
const OUTPUT_AMOUNT = "999000";
const REQUEST_ID = "0xreq123";
const ORDER_ID = "0xorder456";
const PROTOCOL_NAME = "relay";

const POST_DATA = {
    endpoint: "/execute/permits",
    method: "POST",
    body: { kind: "eip712", requestId: REQUEST_ID },
};

// ── Helpers ──────────────────────────────────────────────

function makeQuoteWithSignatureStep(overrides?: Partial<Quote>): Quote {
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
        ...overrides,
    };
}

// ── Tests ────────────────────────────────────────────────

describe("adaptSubmitRequest", () => {
    it("extracts permit body from signature step metadata", () => {
        const result = adaptSubmitRequest(makeQuoteWithSignatureStep());
        expect(result).toEqual(POST_DATA.body);
    });

    it("throws ProviderExecuteFailure when no signature step exists", () => {
        const quote = makeQuoteWithSignatureStep({
            order: {
                steps: [
                    {
                        kind: "transaction",
                        chainId: ORIGIN_CHAIN_ID,
                        description: "Deposit",
                        transaction: { to: VALID_ADDRESS, data: "0xdeadbeef" },
                    },
                ],
            },
        });

        expect(() => adaptSubmitRequest(quote)).toThrow(ProviderExecuteFailure);
    });

    it("throws ProviderExecuteFailure when signature step has no metadata", () => {
        const quote = makeQuoteWithSignatureStep();
        delete (quote.order.steps[0] as Record<string, unknown>).metadata;

        expect(() => adaptSubmitRequest(quote)).toThrow(ProviderExecuteFailure);
    });

    it("throws ProviderExecuteFailure when relayPostData has no body", () => {
        const quote = makeQuoteWithSignatureStep();
        (quote.order.steps[0] as Record<string, unknown>).metadata = {
            relayPostData: { endpoint: "/execute/permits", method: "POST" },
        };

        expect(() => adaptSubmitRequest(quote)).toThrow(ProviderExecuteFailure);
    });
});
