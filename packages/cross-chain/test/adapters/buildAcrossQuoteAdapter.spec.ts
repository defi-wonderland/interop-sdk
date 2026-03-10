import type { Address, Hex } from "viem";
import { decodeFunctionData, pad } from "viem";
import { baseSepolia, sepolia } from "viem/chains";
import { describe, expect, it } from "vitest";

import type { BuildQuoteRequest } from "../../src/core/schemas/quoteRequest.js";
import { buildAcrossQuote } from "../../src/protocols/across/buildQuoteAdapter.js";
import {
    ACROSS_SPOKE_POOL_ADDRESSES,
    ACROSS_SPOKE_POOL_DEPOSIT_ABI,
} from "../../src/protocols/across/constants.js";

const USER = "0x742D35cC6634C0532925A3b844bc9E7595f0BEb8" as Address;
const RECIPIENT = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as Address;
const INPUT_TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address;
const OUTPUT_TOKEN = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address;
const FALLBACK_SPOKE_POOL = "0x95AD61B0A150D79219dcf64E1e6cC01f0C0c8A4A" as Address;
const PROVIDER_ID = "test-across";

function createRequest(overrides?: Partial<BuildQuoteRequest>): BuildQuoteRequest {
    return {
        user: USER,
        input: {
            chainId: sepolia.id,
            assetAddress: INPUT_TOKEN,
            amount: "1000000",
        },
        output: {
            chainId: baseSepolia.id,
            assetAddress: OUTPUT_TOKEN,
            amount: "980000",
        },
        escrowContractAddress: FALLBACK_SPOKE_POOL,
        fillDeadline: Math.floor(Date.now() / 1000) + 3600,
        ...overrides,
    };
}

describe("buildAcrossQuote", () => {
    it("returns a Quote with a single TransactionStep", () => {
        const quote = buildAcrossQuote(createRequest(), PROVIDER_ID);

        expect(quote.order.steps).toHaveLength(1);
        expect(quote.order.steps[0]!.kind).toBe("transaction");
    });

    it("uses known SpokePool address for supported chains", () => {
        const quote = buildAcrossQuote(createRequest(), PROVIDER_ID);
        const step = quote.order.steps[0]!;

        expect(step.kind).toBe("transaction");
        if (step.kind === "transaction") {
            expect(step.transaction.to).toBe(ACROSS_SPOKE_POOL_ADDRESSES[sepolia.id]);
        }
    });

    it("falls back to escrowContractAddress for unknown chains", () => {
        const quote = buildAcrossQuote(
            createRequest({
                input: { chainId: 999999, assetAddress: INPUT_TOKEN, amount: "1000000" },
            }),
            PROVIDER_ID,
        );
        const step = quote.order.steps[0]!;

        expect(step.kind).toBe("transaction");
        if (step.kind === "transaction") {
            expect(step.transaction.to).toBe(FALLBACK_SPOKE_POOL);
        }
    });

    it("encodes valid deposit() calldata with correct args", () => {
        const params = createRequest({
            output: {
                chainId: baseSepolia.id,
                assetAddress: OUTPUT_TOKEN,
                amount: "980000",
                recipient: RECIPIENT,
            },
        });
        const quote = buildAcrossQuote(params, PROVIDER_ID);
        const step = quote.order.steps[0]!;

        expect(step.kind).toBe("transaction");
        if (step.kind === "transaction") {
            const decoded = decodeFunctionData({
                abi: ACROSS_SPOKE_POOL_DEPOSIT_ABI,
                data: step.transaction.data as Hex,
            });

            expect(decoded.functionName).toBe("deposit");
            const [
                depositor,
                recipient,
                inputToken,
                outputToken,
                inputAmount,
                outputAmount,
                destinationChainId,
                exclusiveRelayer,
                ,
                fillDeadline,
                exclusivityParameter,
                message,
            ] = decoded.args;

            expect((depositor as string).toLowerCase()).toBe(
                pad(USER as Hex, { size: 32 }).toLowerCase(),
            );
            expect((recipient as string).toLowerCase()).toBe(
                pad(RECIPIENT as Hex, { size: 32 }).toLowerCase(),
            );
            expect((inputToken as string).toLowerCase()).toBe(
                pad(INPUT_TOKEN as Hex, { size: 32 }).toLowerCase(),
            );
            expect((outputToken as string).toLowerCase()).toBe(
                pad(OUTPUT_TOKEN as Hex, { size: 32 }).toLowerCase(),
            );
            expect(inputAmount).toBe(1000000n);
            expect(outputAmount).toBe(980000n);
            expect(destinationChainId).toBe(BigInt(baseSepolia.id));
            expect(exclusiveRelayer).toBe(pad("0x00" as Hex, { size: 32 }));
            expect(fillDeadline).toBe(params.fillDeadline);
            expect(exclusivityParameter).toBe(0);
            expect(message).toBe("0x73c0de");
        }
    });

    it("sets quoteTimestamp to a recent value", () => {
        const before = Math.floor(Date.now() / 1000);
        const quote = buildAcrossQuote(createRequest(), PROVIDER_ID);
        const after = Math.floor(Date.now() / 1000);

        const step = quote.order.steps[0]!;
        expect(step.kind).toBe("transaction");
        if (step.kind === "transaction") {
            const decoded = decodeFunctionData({
                abi: ACROSS_SPOKE_POOL_DEPOSIT_ABI,
                data: step.transaction.data as Hex,
            });
            const quoteTimestamp = decoded.args[8] as number;
            expect(quoteTimestamp).toBeGreaterThanOrEqual(before);
            expect(quoteTimestamp).toBeLessThanOrEqual(after);
        }
    });

    it("uses user as recipient when no explicit recipient", () => {
        const quote = buildAcrossQuote(createRequest(), PROVIDER_ID);

        expect(quote.preview.outputs[0]!.accountAddress).toBe(USER);

        const step = quote.order.steps[0]!;
        expect(step.kind).toBe("transaction");
        if (step.kind === "transaction") {
            const decoded = decodeFunctionData({
                abi: ACROSS_SPOKE_POOL_DEPOSIT_ABI,
                data: step.transaction.data as Hex,
            });
            expect((decoded.args[1] as string).toLowerCase()).toBe(
                pad(USER as Hex, { size: 32 }).toLowerCase(),
            );
        }
    });

    it("populates preview.inputs correctly", () => {
        const params = createRequest();
        const quote = buildAcrossQuote(params, PROVIDER_ID);

        expect(quote.preview.inputs).toHaveLength(1);
        expect(quote.preview.inputs[0]!.chainId).toBe(sepolia.id);
        expect(quote.preview.inputs[0]!.assetAddress).toBe(INPUT_TOKEN);
        expect(quote.preview.inputs[0]!.amount).toBe("1000000");
    });

    it("populates preview.outputs correctly", () => {
        const params = createRequest();
        const quote = buildAcrossQuote(params, PROVIDER_ID);

        expect(quote.preview.outputs).toHaveLength(1);
        expect(quote.preview.outputs[0]!.chainId).toBe(baseSepolia.id);
        expect(quote.preview.outputs[0]!.assetAddress).toBe(OUTPUT_TOKEN);
        expect(quote.preview.outputs[0]!.amount).toBe("980000");
    });

    it("populates order.checks.allowances", () => {
        const params = createRequest();
        const quote = buildAcrossQuote(params, PROVIDER_ID);

        expect(quote.order.checks!.allowances).toHaveLength(1);
        const allowance = quote.order.checks!.allowances![0]!;
        expect(allowance.chainId).toBe(sepolia.id);
        expect(allowance.tokenAddress).toBe(INPUT_TOKEN);
        expect(allowance.owner).toBe(USER);
        expect(allowance.spender).toBe(ACROSS_SPOKE_POOL_ADDRESSES[sepolia.id]);
        expect(allowance.required).toBe("1000000");
    });

    it("sets the provider field", () => {
        const quote = buildAcrossQuote(createRequest(), PROVIDER_ID);
        expect(quote.provider).toBe(PROVIDER_ID);
    });

    it("includes buildQuote metadata", () => {
        const params = createRequest();
        const quote = buildAcrossQuote(params, PROVIDER_ID);

        expect(quote.metadata!.buildQuote).toBe(true);
        expect(quote.metadata!.fillDeadline).toBe(params.fillDeadline);
        expect(quote.metadata!.spokePoolAddress).toBe(ACROSS_SPOKE_POOL_ADDRESSES[sepolia.id]);
    });

    it("sets the correct origin chainId on the step", () => {
        const quote = buildAcrossQuote(createRequest(), PROVIDER_ID);
        expect(quote.order.steps[0]!.chainId).toBe(sepolia.id);
    });
});
