import { describe, expect, it } from "vitest";

import type { Quote } from "../../../../src/core/schemas/quote.js";
import { ProviderExecuteFailure } from "../../../../src/core/errors/ProviderExecuteFailure.exception.js";
import { adaptSubmitResponse } from "../../../../src/protocols/relay/adapters/submitResponseAdapter.js";

// ── Constants ────────────────────────────────────────────

const VALID_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const ORIGIN_CHAIN_ID = 1;
const DESTINATION_CHAIN_ID = 10;
const INPUT_AMOUNT = "1000000";
const OUTPUT_AMOUNT = "999000";
const REQUEST_ID = "0xreq123";
const ORDER_ID = "0xorder456";
const PROTOCOL_NAME = "relay";

// ── Helpers ──────────────────────────────────────────────

function makeQuote(overrides?: Partial<Quote>): Quote {
    return {
        order: { steps: [] },
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

describe("adaptSubmitResponse", () => {
    it("returns orderId from quote tracking data", () => {
        const result = adaptSubmitResponse(makeQuote());
        expect(result.orderId).toBe(REQUEST_ID);
    });

    it("throws ProviderExecuteFailure when tracking is undefined", () => {
        const quote = makeQuote({ tracking: undefined });
        expect(() => adaptSubmitResponse(quote)).toThrow(ProviderExecuteFailure);
    });

    it("throws ProviderExecuteFailure when orderId is undefined", () => {
        const quote = makeQuote({ tracking: {} });
        expect(() => adaptSubmitResponse(quote)).toThrow(ProviderExecuteFailure);
    });
});
