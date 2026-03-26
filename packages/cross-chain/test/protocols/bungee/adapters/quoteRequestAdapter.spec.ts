import { describe, expect, it } from "vitest";

import type { QuoteRequest } from "../../../../src/core/schemas/quoteRequest.js";
import { ProviderGetQuoteFailure } from "../../../../src/core/errors/ProviderGetQuoteFailure.exception.js";
import { adaptQuoteRequest } from "../../../../src/protocols/bungee/adapters/quoteRequestAdapter.js";

const VALID_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const RECIPIENT_ADDRESS = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";

function buildQuoteRequest(overrides: Partial<QuoteRequest> = {}): QuoteRequest {
    return {
        user: VALID_ADDRESS,
        input: {
            chainId: 1,
            assetAddress: VALID_ADDRESS,
            amount: "1000000",
        },
        output: {
            chainId: 10,
            assetAddress: VALID_ADDRESS,
            recipient: RECIPIENT_ADDRESS,
        },
        ...overrides,
    } as QuoteRequest;
}

describe("adaptQuoteRequest", () => {
    it("maps SDK params to Bungee format with string chain IDs", () => {
        const request = buildQuoteRequest();
        const result = adaptQuoteRequest(request);

        expect(result.originChainId).toBe("1");
        expect(result.destinationChainId).toBe("10");
        expect(result.inputToken).toBe(VALID_ADDRESS);
        expect(result.inputAmount).toBe("1000000");
        expect(result.receiverAddress).toBe(RECIPIENT_ADDRESS);
        expect(result.outputToken).toBe(VALID_ADDRESS);
    });

    it("uses output.recipient when provided", () => {
        const request = buildQuoteRequest({
            output: {
                chainId: 10,
                assetAddress: VALID_ADDRESS,
                recipient: RECIPIENT_ADDRESS,
            },
        });
        const result = adaptQuoteRequest(request);

        expect(result.receiverAddress).toBe(RECIPIENT_ADDRESS);
    });

    it("falls back to user address when no recipient", () => {
        const request = buildQuoteRequest({
            output: {
                chainId: 10,
                assetAddress: VALID_ADDRESS,
            },
        });
        const result = adaptQuoteRequest(request);

        expect(result.receiverAddress).toBe(VALID_ADDRESS);
    });

    it("throws ProviderGetQuoteFailure when input.amount is missing", () => {
        const request = buildQuoteRequest({
            input: {
                chainId: 1,
                assetAddress: VALID_ADDRESS,
            },
        } as Partial<QuoteRequest>);

        expect(() => adaptQuoteRequest(request)).toThrow(ProviderGetQuoteFailure);
    });
});
