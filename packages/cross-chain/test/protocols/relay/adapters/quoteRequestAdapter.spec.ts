import { describe, expect, it } from "vitest";

import type { QuoteRequest } from "../../../../src/core/schemas/quoteRequest.js";
import { ProviderGetQuoteFailure } from "../../../../src/core/errors/ProviderGetQuoteFailure.exception.js";
import { adaptQuoteRequest } from "../../../../src/protocols/relay/adapters/quoteRequestAdapter.js";

// ── Constants ────────────────────────────────────────────

const VALID_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const ORIGIN_CHAIN_ID = 1;
const DESTINATION_CHAIN_ID = 10;
const INPUT_AMOUNT = "1000000";
const OUTPUT_AMOUNT = "500000";

// ── Helpers ──────────────────────────────────────────────

function makeQuoteRequest(overrides?: Partial<QuoteRequest>): QuoteRequest {
    return {
        user: VALID_ADDRESS,
        input: { chainId: ORIGIN_CHAIN_ID, assetAddress: VALID_ADDRESS, amount: INPUT_AMOUNT },
        output: { chainId: DESTINATION_CHAIN_ID, assetAddress: VALID_ADDRESS },
        ...overrides,
    };
}

// ── Tests ────────────────────────────────────────────────

describe("adaptQuoteRequest", () => {
    it("maps exact-input request to EXACT_INPUT trade type", () => {
        const result = adaptQuoteRequest(makeQuoteRequest());
        expect(result.tradeType).toBe("EXACT_INPUT");
        expect(result.amount).toBe(INPUT_AMOUNT);
    });

    it("maps exact-output request to EXPECTED_OUTPUT trade type", () => {
        const result = adaptQuoteRequest(
            makeQuoteRequest({
                swapType: "exact-output",
                input: { chainId: ORIGIN_CHAIN_ID, assetAddress: VALID_ADDRESS },
                output: {
                    chainId: DESTINATION_CHAIN_ID,
                    assetAddress: VALID_ADDRESS,
                    amount: OUTPUT_AMOUNT,
                },
            }),
        );
        expect(result.tradeType).toBe("EXPECTED_OUTPUT");
        expect(result.amount).toBe(OUTPUT_AMOUNT);
    });

    it("maps chain IDs and currency addresses", () => {
        const result = adaptQuoteRequest(makeQuoteRequest());
        expect(result.originChainId).toBe(ORIGIN_CHAIN_ID);
        expect(result.destinationChainId).toBe(DESTINATION_CHAIN_ID);
        expect(result.originCurrency).toBe(VALID_ADDRESS);
        expect(result.destinationCurrency).toBe(VALID_ADDRESS);
    });

    it("maps user and recipient", () => {
        const recipient = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
        const result = adaptQuoteRequest(
            makeQuoteRequest({
                output: {
                    chainId: DESTINATION_CHAIN_ID,
                    assetAddress: VALID_ADDRESS,
                    recipient,
                },
            }),
        );
        expect(result.user).toBe(VALID_ADDRESS);
        expect(result.recipient).toBe(recipient);
    });

    it("includes slippageTolerance as string when provided", () => {
        const result = adaptQuoteRequest(makeQuoteRequest(), { slippageTolerance: 50 });
        expect(result.slippageTolerance).toBe("50");
    });

    it("omits slippageTolerance when not provided", () => {
        const result = adaptQuoteRequest(makeQuoteRequest());
        expect(result.slippageTolerance).toBeUndefined();
    });

    it("throws ProviderGetQuoteFailure when exact-input has no input amount", () => {
        expect(() =>
            adaptQuoteRequest(
                makeQuoteRequest({
                    input: { chainId: ORIGIN_CHAIN_ID, assetAddress: VALID_ADDRESS },
                }),
            ),
        ).toThrow(ProviderGetQuoteFailure);
    });

    it("throws ProviderGetQuoteFailure when exact-output has no output amount", () => {
        expect(() =>
            adaptQuoteRequest(
                makeQuoteRequest({
                    swapType: "exact-output",
                    input: { chainId: ORIGIN_CHAIN_ID, assetAddress: VALID_ADDRESS },
                    output: { chainId: DESTINATION_CHAIN_ID, assetAddress: VALID_ADDRESS },
                }),
            ),
        ).toThrow(ProviderGetQuoteFailure);
    });

    it("includes descriptive error message for missing input amount", () => {
        expect(() =>
            adaptQuoteRequest(
                makeQuoteRequest({
                    input: { chainId: ORIGIN_CHAIN_ID, assetAddress: VALID_ADDRESS },
                }),
            ),
        ).toThrow("exact-input requires input.amount to be defined");
    });

    it("defaults swapType to exact-input when not specified", () => {
        const result = adaptQuoteRequest(makeQuoteRequest());
        expect(result.tradeType).toBe("EXACT_INPUT");
    });
});
