import type { Address } from "viem";
import { describe, expect, it } from "vitest";

import type { QuoteRequest } from "../../src/core/schemas/quoteRequest.js";
import { adaptQuoteRequest } from "../../src/protocols/lifi-intents/adapters/quoteRequestAdapter.js";

const USER_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8" as Address;
const INPUT_TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address;
const OUTPUT_TOKEN = "0x4200000000000000000000000000000000000006" as Address;
const RECEIVER_ADDRESS = "0x1111111111111111111111111111111111111111" as Address;

const INPUT_CHAIN_ID = 8453;
const OUTPUT_CHAIN_ID = 42161;

describe("LI.FI Intents adaptQuoteRequest", () => {
    const baseRequest: QuoteRequest = {
        user: USER_ADDRESS,
        input: {
            chainId: INPUT_CHAIN_ID,
            assetAddress: INPUT_TOKEN,
            amount: "10000000",
        },
        output: {
            chainId: OUTPUT_CHAIN_ID,
            assetAddress: OUTPUT_TOKEN,
        },
    };

    it("converts top-level user to CAIP-10 object", () => {
        const result = adaptQuoteRequest(baseRequest);
        expect(result.user).toEqual({
            chain: `eip155:${INPUT_CHAIN_ID}`,
            address: USER_ADDRESS,
        });
    });

    it("sets intentType to oif-swap", () => {
        const result = adaptQuoteRequest(baseRequest);
        expect(result.intent.intentType).toBe("oif-swap");
    });

    it("sets chain as top-level field on input entries", () => {
        const result = adaptQuoteRequest(baseRequest);
        expect(result.intent.inputs[0]!.chain).toBe(`eip155:${INPUT_CHAIN_ID}`);
    });

    it("uses plain address strings for input user and asset", () => {
        const result = adaptQuoteRequest(baseRequest);
        expect(result.intent.inputs[0]!.user).toBe(USER_ADDRESS);
        expect(result.intent.inputs[0]!.asset).toBe(INPUT_TOKEN);
    });

    it("preserves input amount", () => {
        const result = adaptQuoteRequest(baseRequest);
        expect(result.intent.inputs[0]!.amount).toBe("10000000");
    });

    it("sets chain as top-level field on output entries", () => {
        const result = adaptQuoteRequest(baseRequest);
        expect(result.intent.outputs[0]!.chain).toBe(`eip155:${OUTPUT_CHAIN_ID}`);
    });

    it("uses plain address strings for output receiver and asset", () => {
        const result = adaptQuoteRequest(baseRequest);
        expect(result.intent.outputs[0]!.receiver).toBe(USER_ADDRESS);
        expect(result.intent.outputs[0]!.asset).toBe(OUTPUT_TOKEN);
    });

    it("defaults output receiver to user when no recipient", () => {
        const result = adaptQuoteRequest(baseRequest);
        expect(result.intent.outputs[0]!.receiver).toBe(USER_ADDRESS);
    });

    it("uses explicit recipient when provided", () => {
        const request: QuoteRequest = {
            ...baseRequest,
            output: {
                chainId: OUTPUT_CHAIN_ID,
                assetAddress: OUTPUT_TOKEN,
                recipient: RECEIVER_ADDRESS,
            },
        };
        const result = adaptQuoteRequest(request);
        expect(result.intent.outputs[0]!.receiver).toBe(RECEIVER_ADDRESS);
    });

    it("sets output amount to null (exact-input)", () => {
        const result = adaptQuoteRequest(baseRequest);
        expect(result.intent.outputs[0]!.amount).toBeNull();
    });

    it("always sets swapType to exact-input", () => {
        const result = adaptQuoteRequest(baseRequest);
        expect(result.intent.swapType).toBe("exact-input");
    });

    it("only supports oif-user-open-v0", () => {
        const result = adaptQuoteRequest(baseRequest);
        expect(result.supportedTypes).toEqual(["oif-user-open-v0"]);
    });

    it("throws when input.amount is missing", () => {
        const request: QuoteRequest = {
            ...baseRequest,
            input: { chainId: INPUT_CHAIN_ID, assetAddress: INPUT_TOKEN },
        };
        expect(() => adaptQuoteRequest(request)).toThrow(/input\.amount/);
    });
});
