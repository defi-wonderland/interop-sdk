import type { Hex } from "viem";
import { encodeAddress } from "@wonderland/interop-addresses";
import { pad } from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ProviderQuote } from "../../src/core/interfaces/quotes.interface.js";
import type { QuoteRequest } from "../../src/core/schemas/quoteRequest.js";
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
const SETTLER = "0x52602D7cc3D833F5d28ee6D01C7F82C9b2322e10";
const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const FUTURE_DEADLINE = Math.floor(Date.now() / 1000) + 3600;

const bytes32 = (addr: string): Hex => pad(addr as Hex, { size: 32 });

const mockParams = (overrides: Partial<QuoteRequest> = {}): QuoteRequest => ({
    user: USER_ADDRESS,
    input: { chainId: 1, assetAddress: INPUT_TOKEN, amount: "1000000" },
    output: {
        chainId: 8453,
        assetAddress: OUTPUT_TOKEN,
        amount: "999000",
        recipient: USER_ADDRESS,
    },
    ...overrides,
});

function createMockProviderQuote(): ProviderQuote {
    return {
        order: {
            type: "oif-escrow-v0" as const,
            payload: {
                signatureType: "eip712" as const,
                domain: { name: "Permit2", chainId: 1, verifyingContract: PERMIT2 },
                primaryType: "PermitBatchWitnessTransferFrom",
                types: {
                    PermitBatchWitnessTransferFrom: [{ name: "spender", type: "address" }],
                },
                message: {
                    permitted: [{ token: INPUT_TOKEN, amount: "1000000" }],
                    spender: SETTLER,
                    nonce: "1",
                    deadline: FUTURE_DEADLINE,
                    witness: {
                        user: USER_ADDRESS,
                        expires: FUTURE_DEADLINE,
                        inputOracle: SETTLER,
                        outputs: [
                            {
                                oracle: bytes32(SETTLER),
                                settler: bytes32(SETTLER),
                                chainId: 8453,
                                token: bytes32(OUTPUT_TOKEN),
                                amount: "999000",
                                recipient: bytes32(USER_ADDRESS),
                                callbackData: "0x",
                                context: "0x",
                            },
                        ],
                    },
                },
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
        const result = adaptQuote(createMockProviderQuote(), mockParams());

        expect(result.order.steps).toHaveLength(1);
        expect(result.order.steps[0]!.kind).toBe("signature");
    });

    it("maps OIF order type to lock mechanism", () => {
        const result = adaptQuote(createMockProviderQuote(), mockParams());

        expect(result.order.lock).toEqual({ type: "oif-escrow" });
    });

    it("converts preview inputs from ERC-7930 to flat fields", () => {
        const result = adaptQuote(createMockProviderQuote(), mockParams());

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
        const result = adaptQuote(createMockProviderQuote(), mockParams());

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
        const result = adaptQuote(createMockProviderQuote(), mockParams());

        expect(result.provider).toBe("test-solver");
        expect(result.quoteId).toBe("quote-123");
        expect(result.validUntil).toBe(1700000000);
        expect(result.eta).toBe(30);
    });

    it("defaults amount to '0' when undefined", () => {
        const quote = createMockProviderQuote();
        quote.preview.inputs[0]!.amount = undefined as unknown as string;

        const result = adaptQuote(quote, mockParams());
        expect(result.preview.inputs[0]!.amount).toBe("0");
    });

    it("defaults provider to empty string when undefined", () => {
        const quote = createMockProviderQuote();
        (quote as Record<string, unknown>).provider = undefined;

        const result = adaptQuote(quote, mockParams());
        expect(result.provider).toBe("");
    });

    describe("Permit2 allowances for oif-escrow-v0", () => {
        afterEach(() => {
            vi.restoreAllMocks();
        });

        it("surfaces checks.allowances with Permit2 spender using the preview signer", () => {
            const result = adaptQuote(createMockProviderQuote(), mockParams());

            expect(result.order.checks?.allowances).toEqual([
                {
                    chainId: 1,
                    tokenAddress: INPUT_TOKEN,
                    owner: expect.stringMatching(new RegExp(`^${USER_ADDRESS}$`, "i")),
                    spender: PERMIT2,
                    required: "1000000",
                    preferInfinite: true,
                },
            ]);
        });

        it("warns and omits checks when preview.inputs is empty", () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
            const quote = createMockProviderQuote();
            quote.preview.inputs = [];

            const result = adaptQuote(quote, mockParams());

            expect(result.order.checks).toBeUndefined();
            expect(warn).toHaveBeenCalledWith(expect.stringContaining("missing signer in preview"));
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
