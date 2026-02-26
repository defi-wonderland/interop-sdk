import type { Address } from "viem";
import { encodeAddress } from "@wonderland/interop-addresses";
import { describe, expect, it } from "vitest";

import type { ProviderQuote } from "../../src/protocols/oif/types.js";
import { adaptQuote } from "../../src/protocols/oif/adapters/quoteAdapter.js";

const USER_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8" as Address;
const RECEIVER_ADDRESS = "0x1111111111111111111111111111111111111111" as Address;
const INPUT_TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address;
const OUTPUT_TOKEN = "0x4200000000000000000000000000000000000006" as Address;

function toErc7930(chainId: number, address: string): string {
    return encodeAddress(
        { version: 1, chainType: "eip155", chainReference: chainId.toString(), address },
        { format: "hex" },
    ) as string;
}

const mockProviderQuote: ProviderQuote = {
    order: {
        type: "oif-escrow-v0",
        payload: {
            signatureType: "eip712",
            domain: { name: "Permit2", chainId: 1 },
            primaryType: "PermitBatchWitnessTransferFrom",
            types: {},
            message: {},
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
                receiver: toErc7930(8453, RECEIVER_ADDRESS),
                asset: toErc7930(8453, OUTPUT_TOKEN),
                amount: "950000",
            },
        ],
    },
    partialFill: false,
    quoteId: "test-quote-123",
    failureHandling: "refund-automatic",
    provider: "test-provider",
    eta: 30,
    validUntil: 1700000000,
};

describe("quoteAdapter", () => {
    describe("adaptQuote", () => {
        it("converts order to step-based format", () => {
            const result = adaptQuote(mockProviderQuote);

            expect(result.order.steps).toHaveLength(1);
            expect(result.order.steps[0]!.kind).toBe("signature");
        });

        it("converts preview input addresses to InteropAccountId", () => {
            const result = adaptQuote(mockProviderQuote);
            const input = result.preview.inputs[0]!;

            expect(input.account.chainId).toBe(1);
            expect(input.account.address.toLowerCase()).toBe(USER_ADDRESS.toLowerCase());
            expect(input.asset.chainId).toBe(1);
            expect(input.asset.address.toLowerCase()).toBe(INPUT_TOKEN.toLowerCase());
            expect(input.amount).toBe("1000000");
        });

        it("converts preview output addresses to InteropAccountId", () => {
            const result = adaptQuote(mockProviderQuote);
            const output = result.preview.outputs[0]!;

            expect(output.account.chainId).toBe(8453);
            expect(output.account.address.toLowerCase()).toBe(RECEIVER_ADDRESS.toLowerCase());
            expect(output.asset.chainId).toBe(8453);
            expect(output.asset.address.toLowerCase()).toBe(OUTPUT_TOKEN.toLowerCase());
            expect(output.amount).toBe("950000");
        });

        it("defaults amount to '0' when not provided", () => {
            const quote: ProviderQuote = {
                ...mockProviderQuote,
                preview: {
                    inputs: [
                        {
                            user: toErc7930(1, USER_ADDRESS),
                            asset: toErc7930(1, INPUT_TOKEN),
                            // amount intentionally omitted
                        },
                    ],
                    outputs: [
                        {
                            receiver: toErc7930(8453, RECEIVER_ADDRESS),
                            asset: toErc7930(8453, OUTPUT_TOKEN),
                        },
                    ],
                },
            };

            const result = adaptQuote(quote);
            expect(result.preview.inputs[0]!.amount).toBe("0");
            expect(result.preview.outputs[0]!.amount).toBe("0");
        });

        it("preserves scalar quote fields", () => {
            const result = adaptQuote(mockProviderQuote);

            expect(result.provider).toBe("test-provider");
            expect(result.quoteId).toBe("test-quote-123");
            expect(result.failureHandling).toBe("refund-automatic");
            expect(result.partialFill).toBe(false);
            expect(result.eta).toBe(30);
            expect(result.validUntil).toBe(1700000000);
        });

        it("handles missing provider as empty string", () => {
            const quote: ProviderQuote = {
                ...mockProviderQuote,
                provider: undefined,
            };
            const result = adaptQuote(quote);
            expect(result.provider).toBe("");
        });

        it("works with OIF escrow orders", () => {
            const quote: ProviderQuote = {
                ...mockProviderQuote,
                order: {
                    type: "oif-escrow-v0",
                    payload: {
                        signatureType: "eip712",
                        domain: { name: "Permit2", chainId: 1 },
                        primaryType: "PermitBatchWitnessTransferFrom",
                        types: {},
                        message: {},
                    },
                },
            };

            const result = adaptQuote(quote);
            expect(result.order.steps[0]!.kind).toBe("signature");
            expect(result.order.lock).toEqual({ type: "oif-escrow" });
        });
    });
});
