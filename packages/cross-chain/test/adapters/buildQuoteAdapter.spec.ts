import type { Address, Hex } from "viem";
import { decodeFunctionData } from "viem";
import { describe, expect, it } from "vitest";

import type { BuildQuoteRequest } from "../../src/core/schemas/quoteRequest.js";
import { BuildQuoteRequestSchema } from "../../src/core/schemas/quoteRequest.js";
import { buildOifQuote } from "../../src/protocols/oif/adapters/buildQuoteAdapter.js";
import { OPEN_ABI } from "../../src/protocols/oif/constants.js";

const USER = "0x742D35cC6634C0532925A3b844bc9E7595f0BEb8" as Address;
const ESCROW = "0x95AD61B0A150D79219dcf64E1e6cC01f0C0c8A4A" as Address;
const INPUT_TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address;
const OUTPUT_TOKEN = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address;
const RECIPIENT = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as Address;

const PROVIDER_ID = "test-oif-provider";

function createBuildQuoteRequest(overrides?: Partial<BuildQuoteRequest>): BuildQuoteRequest {
    return {
        user: USER,
        input: {
            chainId: 1,
            assetAddress: INPUT_TOKEN,
            amount: "1000000",
        },
        output: {
            chainId: 8453,
            assetAddress: OUTPUT_TOKEN,
            amount: "990000",
        },
        escrowContractAddress: ESCROW,
        fillDeadline: 1700003600,
        ...overrides,
    };
}

describe("BuildQuoteRequestSchema", () => {
    it("accepts a valid build quote request", () => {
        const result = BuildQuoteRequestSchema.safeParse(createBuildQuoteRequest());
        expect(result.success).toBe(true);
    });

    it("rejects when input.amount is missing", () => {
        const request = createBuildQuoteRequest();
        (request.input as Record<string, unknown>).amount = undefined;
        const result = BuildQuoteRequestSchema.safeParse(request);
        expect(result.success).toBe(false);
    });

    it("rejects when output.amount is missing", () => {
        const request = createBuildQuoteRequest();
        (request.output as Record<string, unknown>).amount = undefined;
        const result = BuildQuoteRequestSchema.safeParse(request);
        expect(result.success).toBe(false);
    });

    it("rejects when escrowContractAddress is missing", () => {
        const { escrowContractAddress: _, ...noEscrow } = createBuildQuoteRequest();
        const result = BuildQuoteRequestSchema.safeParse(noEscrow);
        expect(result.success).toBe(false);
    });

    it("rejects when fillDeadline is missing", () => {
        const { fillDeadline: _, ...noDeadline } = createBuildQuoteRequest();
        const result = BuildQuoteRequestSchema.safeParse(noDeadline);
        expect(result.success).toBe(false);
    });

    it("rejects invalid address", () => {
        const result = BuildQuoteRequestSchema.safeParse(
            createBuildQuoteRequest({ user: "not-an-address" as Address }),
        );
        expect(result.success).toBe(false);
    });

    it("rejects non-numeric amount", () => {
        const result = BuildQuoteRequestSchema.safeParse(
            createBuildQuoteRequest({
                input: { chainId: 1, assetAddress: INPUT_TOKEN, amount: "1.5" },
            }),
        );
        expect(result.success).toBe(false);
    });

    it("accepts optional recipient", () => {
        const result = BuildQuoteRequestSchema.safeParse(
            createBuildQuoteRequest({
                output: {
                    chainId: 8453,
                    assetAddress: OUTPUT_TOKEN,
                    amount: "990000",
                    recipient: RECIPIENT,
                },
            }),
        );
        expect(result.success).toBe(true);
    });

    it("rejects invalid orderDataType hex", () => {
        const result = BuildQuoteRequestSchema.safeParse(
            createBuildQuoteRequest({ orderDataType: "not-hex" }),
        );
        expect(result.success).toBe(false);
    });

    it("rejects invalid orderData hex", () => {
        const result = BuildQuoteRequestSchema.safeParse(
            createBuildQuoteRequest({ orderData: "not-hex" }),
        );
        expect(result.success).toBe(false);
    });

    it("accepts valid orderDataType hex", () => {
        const result = BuildQuoteRequestSchema.safeParse(
            createBuildQuoteRequest({ orderDataType: "0xabcdef" }),
        );
        expect(result.success).toBe(true);
    });

    it("accepts valid orderData hex", () => {
        const result = BuildQuoteRequestSchema.safeParse(
            createBuildQuoteRequest({ orderData: "0x1234" }),
        );
        expect(result.success).toBe(true);
    });
});

describe("buildOifQuote", () => {
    it("returns a Quote with a single TransactionStep", () => {
        const quote = buildOifQuote(createBuildQuoteRequest(), PROVIDER_ID);

        expect(quote.order.steps).toHaveLength(1);
        expect(quote.order.steps[0]!.kind).toBe("transaction");
    });

    it("targets the escrow contract address", () => {
        const quote = buildOifQuote(createBuildQuoteRequest(), PROVIDER_ID);

        const step = quote.order.steps[0]!;
        expect(step.kind).toBe("transaction");
        if (step.kind === "transaction") {
            expect(step.transaction.to).toBe(ESCROW);
        }
    });

    it("sets the correct origin chainId on the step", () => {
        const quote = buildOifQuote(createBuildQuoteRequest(), PROVIDER_ID);

        expect(quote.order.steps[0]!.chainId).toBe(1);
    });

    it("encodes valid open() calldata", () => {
        const params = createBuildQuoteRequest();
        const quote = buildOifQuote(params, PROVIDER_ID);

        const step = quote.order.steps[0]!;
        expect(step.kind).toBe("transaction");
        if (step.kind === "transaction") {
            const decoded = decodeFunctionData({
                abi: OPEN_ABI,
                data: step.transaction.data as Hex,
            });

            expect(decoded.functionName).toBe("open");
            const args = decoded.args as [
                { fillDeadline: number; orderDataType: Hex; orderData: Hex },
            ];
            expect(args[0].fillDeadline).toBe(params.fillDeadline);
        }
    });

    it("populates preview inputs from request params", () => {
        const params = createBuildQuoteRequest();
        const quote = buildOifQuote(params, PROVIDER_ID);

        expect(quote.preview.inputs).toHaveLength(1);
        expect(quote.preview.inputs[0]!.chainId).toBe(1);
        expect(quote.preview.inputs[0]!.accountAddress).toBe(USER);
        expect(quote.preview.inputs[0]!.assetAddress).toBe(INPUT_TOKEN);
        expect(quote.preview.inputs[0]!.amount).toBe("1000000");
    });

    it("populates preview outputs from request params", () => {
        const params = createBuildQuoteRequest();
        const quote = buildOifQuote(params, PROVIDER_ID);

        expect(quote.preview.outputs).toHaveLength(1);
        expect(quote.preview.outputs[0]!.chainId).toBe(8453);
        expect(quote.preview.outputs[0]!.assetAddress).toBe(OUTPUT_TOKEN);
        expect(quote.preview.outputs[0]!.amount).toBe("990000");
    });

    it("uses user address as recipient when no explicit recipient", () => {
        const params = createBuildQuoteRequest();
        const quote = buildOifQuote(params, PROVIDER_ID);

        expect(quote.preview.outputs[0]!.accountAddress).toBe(USER);
    });

    it("uses explicit recipient when provided", () => {
        const params = createBuildQuoteRequest({
            output: {
                chainId: 8453,
                assetAddress: OUTPUT_TOKEN,
                amount: "990000",
                recipient: RECIPIENT,
            },
        });
        const quote = buildOifQuote(params, PROVIDER_ID);

        expect(quote.preview.outputs[0]!.accountAddress).toBe(RECIPIENT);
    });

    it("sets the provider field", () => {
        const quote = buildOifQuote(createBuildQuoteRequest(), PROVIDER_ID);
        expect(quote.provider).toBe(PROVIDER_ID);
    });

    it("populates order.checks.allowances", () => {
        const params = createBuildQuoteRequest();
        const quote = buildOifQuote(params, PROVIDER_ID);

        expect(quote.order.checks).toBeDefined();
        expect(quote.order.checks!.allowances).toHaveLength(1);

        const allowance = quote.order.checks!.allowances![0]!;
        expect(allowance.chainId).toBe(1);
        expect(allowance.tokenAddress).toBe(INPUT_TOKEN);
        expect(allowance.owner).toBe(USER);
        expect(allowance.spender).toBe(ESCROW);
        expect(allowance.required).toBe("1000000");
    });

    it("includes buildQuote metadata", () => {
        const params = createBuildQuoteRequest();
        const quote = buildOifQuote(params, PROVIDER_ID);

        expect(quote.metadata).toBeDefined();
        expect(quote.metadata!.buildQuote).toBe(true);
        expect(quote.metadata!.fillDeadline).toBe(params.fillDeadline);
        expect(quote.metadata!.escrowContractAddress).toBe(ESCROW);
    });

    it("accepts optional orderDataType override", () => {
        const customOrderDataType =
            "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
        const params = createBuildQuoteRequest({ orderDataType: customOrderDataType });
        const quote = buildOifQuote(params, PROVIDER_ID);

        const step = quote.order.steps[0]!;
        expect(step.kind).toBe("transaction");
        if (step.kind === "transaction") {
            const decoded = decodeFunctionData({
                abi: OPEN_ABI,
                data: step.transaction.data as Hex,
            });
            const args = decoded.args as [
                { fillDeadline: number; orderDataType: Hex; orderData: Hex },
            ];
            expect(args[0].orderDataType).toBe(customOrderDataType);
        }
    });
});
