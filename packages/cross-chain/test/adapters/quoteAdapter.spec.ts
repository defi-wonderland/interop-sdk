import { encodeAddress } from "@wonderland/interop-addresses";
import { describe, expect, it } from "vitest";

import type { ProviderQuote } from "../../src/core/interfaces/quotes.interface.js";
import { adaptQuote } from "../../src/protocols/oif/adapters/quoteAdapter.js";

function toErc7930(chainId: number, address: string): string {
    return encodeAddress(
        { version: 1, chainType: "eip155", chainReference: chainId.toString(), address },
        { format: "hex" },
    ) as string;
}

const USER_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8";
const INPUT_TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const OUTPUT_TOKEN = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

function createMockProviderQuote(): ProviderQuote {
    return {
        order: {
            type: "oif-escrow-v0" as const,
            payload: {
                signatureType: "eip712" as const,
                domain: { name: "Permit2", chainId: 1 },
                primaryType: "PermitBatchWitnessTransferFrom",
                types: {
                    PermitBatchWitnessTransferFrom: [{ name: "spender", type: "address" }],
                },
                message: { spender: "0xabc" },
            },
        },
        preview: {
            inputs: [
                {
                    user: toErc7930(1, USER_ADDRESS),
                    asset: toErc7930(1, INPUT_TOKEN),
                    amount: "1000000",
                },
            ],
            outputs: [
                {
                    receiver: toErc7930(8453, USER_ADDRESS),
                    asset: toErc7930(8453, OUTPUT_TOKEN),
                    amount: "999000",
                },
            ],
        },
        provider: "test-solver",
        quoteId: "quote-123",
        validUntil: 1700000000,
        eta: 30,
    };
}

describe("quoteAdapter", () => {
    it("converts OIF order to step-based SDK order", () => {
        const result = adaptQuote(createMockProviderQuote());

        expect(result.order.steps).toHaveLength(1);
        expect(result.order.steps[0]!.kind).toBe("signature");
    });

    it("maps OIF order type to lock mechanism", () => {
        const result = adaptQuote(createMockProviderQuote());

        expect(result.order.lock).toEqual({ type: "oif-escrow" });
    });

    it("converts preview inputs from ERC-7930 to flat fields", () => {
        const result = adaptQuote(createMockProviderQuote());

        expect(result.preview.inputs).toHaveLength(1);
        expect(result.preview.inputs[0]!.chainId).toBe(1);
        expect(result.preview.inputs[0]!.accountAddress.toLowerCase()).toBe(
            USER_ADDRESS.toLowerCase(),
        );
        expect(result.preview.inputs[0]!.assetAddress.toLowerCase()).toBe(
            INPUT_TOKEN.toLowerCase(),
        );
        expect(result.preview.inputs[0]!.amount).toBe("1000000");
    });

    it("converts preview outputs from ERC-7930 to flat fields", () => {
        const result = adaptQuote(createMockProviderQuote());

        expect(result.preview.outputs).toHaveLength(1);
        expect(result.preview.outputs[0]!.chainId).toBe(8453);
        expect(result.preview.outputs[0]!.accountAddress.toLowerCase()).toBe(
            USER_ADDRESS.toLowerCase(),
        );
        expect(result.preview.outputs[0]!.assetAddress.toLowerCase()).toBe(
            OUTPUT_TOKEN.toLowerCase(),
        );
        expect(result.preview.outputs[0]!.amount).toBe("999000");
    });

    it("preserves quote metadata fields", () => {
        const result = adaptQuote(createMockProviderQuote());

        expect(result.provider).toBe("test-solver");
        expect(result.quoteId).toBe("quote-123");
        expect(result.validUntil).toBe(1700000000);
        expect(result.eta).toBe(30);
    });

    it("defaults amount to '0' when undefined", () => {
        const quote = createMockProviderQuote();
        quote.preview.inputs[0]!.amount = undefined as unknown as string;

        const result = adaptQuote(quote);
        expect(result.preview.inputs[0]!.amount).toBe("0");
    });

    it("defaults provider to empty string when undefined", () => {
        const quote = createMockProviderQuote();
        (quote as Record<string, unknown>).provider = undefined;

        const result = adaptQuote(quote);
        expect(result.provider).toBe("");
    });
});
