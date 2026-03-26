import { describe, expect, it } from "vitest";

import { InteropAccountIdSchema } from "../../src/core/schemas/interopAccountId.js";
import { OrderSchema, StepSchema } from "../../src/core/schemas/order.js";
import { QuoteSchema } from "../../src/core/schemas/quote.js";
import { QuoteRequestSchema } from "../../src/core/schemas/quoteRequest.js";

describe("InteropAccountIdSchema", () => {
    it("accepts valid account ID", () => {
        const result = InteropAccountIdSchema.safeParse({
            chainId: 1,
            address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        });
        expect(result.success).toBe(true);
    });

    it("rejects non-integer chainId", () => {
        const result = InteropAccountIdSchema.safeParse({
            chainId: 1.5,
            address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        });
        expect(result.success).toBe(false);
    });

    it("rejects negative chainId", () => {
        const result = InteropAccountIdSchema.safeParse({
            chainId: -1,
            address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        });
        expect(result.success).toBe(false);
    });

    it("rejects unsafe integer chainId", () => {
        const result = InteropAccountIdSchema.safeParse({
            chainId: Number.MAX_SAFE_INTEGER + 1,
            address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        });
        expect(result.success).toBe(false);
    });

    it("rejects invalid hex address", () => {
        const result = InteropAccountIdSchema.safeParse({
            chainId: 1,
            address: "not-an-address",
        });
        expect(result.success).toBe(false);
    });
});

describe("StepSchema", () => {
    it("accepts a valid transaction step", () => {
        const result = StepSchema.safeParse({
            kind: "transaction",
            chainId: 1,
            transaction: {
                to: "0x1234567890123456789012345678901234567890",
                data: "0xabcdef",
            },
        });
        expect(result.success).toBe(true);
    });

    it("accepts a valid signature step", () => {
        const result = StepSchema.safeParse({
            kind: "signature",
            chainId: 1,
            signaturePayload: {
                signatureType: "eip712",
                domain: { name: "Test" },
                primaryType: "TestMessage",
                types: { TestMessage: [{ name: "value", type: "uint256" }] },
                message: { value: "100" },
            },
        });
        expect(result.success).toBe(true);
    });

    it("rejects unknown step kind", () => {
        const result = StepSchema.safeParse({
            kind: "unknown",
            chainId: 1,
        });
        expect(result.success).toBe(false);
    });

    it("rejects unsafe integer chainId in transaction step", () => {
        const result = StepSchema.safeParse({
            kind: "transaction",
            chainId: Number.MAX_SAFE_INTEGER + 1,
            transaction: {
                to: "0x1234567890123456789012345678901234567890",
                data: "0x",
            },
        });
        expect(result.success).toBe(false);
    });

    it("rejects invalid address in transaction.to", () => {
        const result = StepSchema.safeParse({
            kind: "transaction",
            chainId: 1,
            transaction: {
                to: "not-an-address",
                data: "0x",
            },
        });
        expect(result.success).toBe(false);
    });
});

describe("OrderSchema", () => {
    it("accepts a valid order with one step", () => {
        const result = OrderSchema.safeParse({
            steps: [
                {
                    kind: "transaction",
                    chainId: 1,
                    transaction: { to: "0x1234567890123456789012345678901234567890", data: "0x" },
                },
            ],
        });
        expect(result.success).toBe(true);
    });

    it("rejects an order with empty steps", () => {
        const result = OrderSchema.safeParse({ steps: [] });
        expect(result.success).toBe(false);
    });

    it("accepts order with lock mechanism", () => {
        const result = OrderSchema.safeParse({
            steps: [
                {
                    kind: "signature",
                    chainId: 1,
                    signaturePayload: {
                        signatureType: "eip712",
                        domain: {},
                        primaryType: "T",
                        types: {},
                        message: {},
                    },
                },
            ],
            lock: { type: "oif-escrow" },
        });
        expect(result.success).toBe(true);
    });
});

describe("QuoteRequestSchema", () => {
    const validRequest = {
        user: "0x742D35cC6634C0532925A3b844bc9E7595f0BEb8",
        input: {
            chainId: 1,
            assetAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            amount: "1000000",
        },
        output: {
            chainId: 8453,
            assetAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        },
    };

    it("accepts a valid quote request", () => {
        const result = QuoteRequestSchema.safeParse(validRequest);
        expect(result.success).toBe(true);
    });

    it("accepts with optional swapType", () => {
        const result = QuoteRequestSchema.safeParse({
            ...validRequest,
            output: {
                ...validRequest.output,
                amount: "999000",
            },
            swapType: "exact-output",
        });
        expect(result.success).toBe(true);
    });

    it("rejects invalid swapType", () => {
        const result = QuoteRequestSchema.safeParse({
            ...validRequest,
            swapType: "invalid",
        });
        expect(result.success).toBe(false);
    });

    it("rejects non-numeric amount string", () => {
        const result = QuoteRequestSchema.safeParse({
            ...validRequest,
            input: {
                chainId: 1,
                assetAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                amount: "1.5",
            },
        });
        expect(result.success).toBe(false);
    });

    it("accepts valid recipient address", () => {
        const result = QuoteRequestSchema.safeParse({
            ...validRequest,
            output: {
                ...validRequest.output,
                recipient: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            },
        });
        expect(result.success).toBe(true);
    });

    it("rejects invalid recipient address", () => {
        const result = QuoteRequestSchema.safeParse({
            ...validRequest,
            output: {
                ...validRequest.output,
                recipient: "not-an-address",
            },
        });
        expect(result.success).toBe(false);
    });

    it("rejects exact-input without input.amount", () => {
        const result = QuoteRequestSchema.safeParse({
            ...validRequest,
            input: {
                chainId: 1,
                assetAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            },
            swapType: "exact-input",
        });
        expect(result.success).toBe(false);
    });

    it("rejects exact-output without output.amount", () => {
        const result = QuoteRequestSchema.safeParse({
            ...validRequest,
            output: {
                chainId: 8453,
                assetAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            },
            swapType: "exact-output",
        });
        expect(result.success).toBe(false);
    });

    it("accepts exact-input with input.amount", () => {
        const result = QuoteRequestSchema.safeParse({
            ...validRequest,
            swapType: "exact-input",
        });
        expect(result.success).toBe(true);
    });

    it("rejects omitted swapType without input.amount (defaults to exact-input)", () => {
        const result = QuoteRequestSchema.safeParse({
            ...validRequest,
            input: {
                chainId: 1,
                assetAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            },
        });
        expect(result.success).toBe(false);
    });

    it("rejects unsafe integer chainId in input", () => {
        const result = QuoteRequestSchema.safeParse({
            ...validRequest,
            input: {
                ...validRequest.input,
                chainId: Number.MAX_SAFE_INTEGER + 1,
            },
        });
        expect(result.success).toBe(false);
    });

    it("rejects invalid calldata hex", () => {
        const result = QuoteRequestSchema.safeParse({
            ...validRequest,
            output: {
                ...validRequest.output,
                calldata: "not-hex",
            },
        });
        expect(result.success).toBe(false);
    });

    it("accepts valid calldata hex", () => {
        const result = QuoteRequestSchema.safeParse({
            ...validRequest,
            output: {
                ...validRequest.output,
                calldata: "0xabcdef01",
            },
        });
        expect(result.success).toBe(true);
    });
});

describe("QuoteSchema", () => {
    const validQuote = {
        order: {
            steps: [
                {
                    kind: "transaction" as const,
                    chainId: 1,
                    transaction: { to: "0x1234567890123456789012345678901234567890", data: "0x" },
                },
            ],
        },
        preview: {
            inputs: [
                {
                    chainId: 1,
                    accountAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                    assetAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                    amount: "1000000",
                },
            ],
            outputs: [
                {
                    chainId: 8453,
                    accountAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                    assetAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                    amount: "999000",
                },
            ],
        },
        provider: "test-solver",
    };

    it("accepts a valid quote", () => {
        const result = QuoteSchema.safeParse(validQuote);
        expect(result.success).toBe(true);
    });

    it("accepts with optional fields", () => {
        const result = QuoteSchema.safeParse({
            ...validQuote,
            eta: 30,
            validUntil: 1700000000,
            quoteId: "abc-123",
            partialFill: false,
        });
        expect(result.success).toBe(true);
    });

    it("rejects negative eta", () => {
        const result = QuoteSchema.safeParse({
            ...validQuote,
            eta: -1,
        });
        expect(result.success).toBe(false);
    });

    it("rejects negative validUntil", () => {
        const result = QuoteSchema.safeParse({
            ...validQuote,
            validUntil: -100,
        });
        expect(result.success).toBe(false);
    });

    it("rejects empty inputs array", () => {
        const result = QuoteSchema.safeParse({
            ...validQuote,
            preview: { ...validQuote.preview, inputs: [] },
        });
        expect(result.success).toBe(false);
    });

    it("rejects empty outputs array", () => {
        const result = QuoteSchema.safeParse({
            ...validQuote,
            preview: { ...validQuote.preview, outputs: [] },
        });
        expect(result.success).toBe(false);
    });

    it("rejects unsafe integer chainId in preview entry", () => {
        const result = QuoteSchema.safeParse({
            ...validQuote,
            preview: {
                inputs: [{ ...validQuote.preview.inputs[0], chainId: Number.MAX_SAFE_INTEGER + 1 }],
                outputs: validQuote.preview.outputs,
            },
        });
        expect(result.success).toBe(false);
    });
});
