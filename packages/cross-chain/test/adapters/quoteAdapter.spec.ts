import { encodeAddress } from "@wonderland/interop-addresses";
import { afterEach, describe, expect, it, vi } from "vitest";

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

    describe("Permit2 allowances for oif-escrow-v0", () => {
        const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
        const PERMITTED_TOKEN = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

        afterEach(() => {
            vi.restoreAllMocks();
        });

        function withEscrowPermit2(
            overrides?: Partial<{ permittedToken: string; amount: string; primaryType: string }>,
        ): ProviderQuote {
            const quote = createMockProviderQuote();
            quote.order = {
                type: "oif-escrow-v0" as const,
                payload: {
                    signatureType: "eip712" as const,
                    domain: { name: "Permit2", chainId: 1, verifyingContract: PERMIT2 },
                    primaryType: overrides?.primaryType ?? "PermitBatchWitnessTransferFrom",
                    types: {
                        PermitBatchWitnessTransferFrom: [{ name: "spender", type: "address" }],
                    },
                    message: {
                        permitted: [
                            {
                                token: overrides?.permittedToken ?? PERMITTED_TOKEN,
                                amount: overrides?.amount ?? "500000",
                            },
                        ],
                        spender: "0x1234567890abcdef1234567890abcdef12345678",
                        nonce: "1",
                        deadline: "1700000000",
                    },
                },
            };
            return quote;
        }

        it("surfaces checks.allowances with Permit2 spender using the preview signer", () => {
            const result = adaptQuote(withEscrowPermit2());

            expect(result.order.checks?.allowances).toEqual([
                {
                    chainId: 1,
                    tokenAddress: PERMITTED_TOKEN,
                    owner: expect.stringMatching(new RegExp(`^${USER_ADDRESS}$`, "i")),
                    spender: PERMIT2,
                    required: "500000",
                },
            ]);
        });

        it("warns and omits checks when preview.inputs is empty", () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
            const quote = withEscrowPermit2();
            quote.preview.inputs = [];

            const result = adaptQuote(quote);

            expect(result.order.checks).toBeUndefined();
            expect(warn).toHaveBeenCalledWith(expect.stringContaining("missing signer in preview"));
        });

        it("omits checks when the extractor returns no allowances", () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

            const result = adaptQuote(withEscrowPermit2({ primaryType: "UnknownType" }));

            expect(result.order.checks).toBeUndefined();
            expect(warn).toHaveBeenCalled();
        });

        it("does not touch order.checks on non-escrow order types", () => {
            const quote = createMockProviderQuote();
            // Default mock order is oif-escrow-v0 with no `permitted` → no allowances.
            // Switch to a resource-lock style payload to exercise the non-escrow path.
            quote.order = {
                type: "oif-resource-lock-v0" as const,
                payload: {
                    signatureType: "eip712" as const,
                    domain: { chainId: 1 },
                    primaryType: "BatchCompact",
                    types: { BatchCompact: [{ name: "arbiter", type: "address" }] },
                    message: {},
                },
            };

            const result = adaptQuote(quote);

            expect(result.order.checks).toBeUndefined();
        });
    });
});
