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

    it("forwards feeBps and feeTakerAddress from options", () => {
        const request = buildQuoteRequest();
        const result = adaptQuoteRequest(request, {
            feeBps: "50",
            feeTakerAddress: "0xfee",
        });

        expect(result.feeBps).toBe("50");
        expect(result.feeTakerAddress).toBe("0xfee");
    });

    it("sets useInbox when submissionMode is user-transaction", () => {
        const request = buildQuoteRequest();
        const result = adaptQuoteRequest(request, { submissionMode: "user-transaction" });

        expect(result.useInbox).toBe("true");
    });

    it("does not set useInbox when submissionMode is gasless", () => {
        const request = buildQuoteRequest();
        const result = adaptQuoteRequest(request, { submissionMode: "gasless" });

        expect(result.useInbox).toBeUndefined();
    });

    it("forwards slippage from options", () => {
        const request = buildQuoteRequest();
        const result = adaptQuoteRequest(request, { slippage: "0.5" });

        expect(result.slippage).toBe("0.5");
    });

    it("sets refuel when option is true", () => {
        const request = buildQuoteRequest();
        const result = adaptQuoteRequest(request, { refuel: true });

        expect(result.refuel).toBe("true");
    });

    it("omits optional fields when options are not provided", () => {
        const request = buildQuoteRequest();
        const result = adaptQuoteRequest(request);

        expect(result.feeBps).toBeUndefined();
        expect(result.feeTakerAddress).toBeUndefined();
        expect(result.useInbox).toBeUndefined();
        expect(result.slippage).toBeUndefined();
        expect(result.refuel).toBeUndefined();
    });
});
