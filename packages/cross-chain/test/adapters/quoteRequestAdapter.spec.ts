import type { Address } from "viem";
import { encodeAddress } from "@wonderland/interop-addresses";
import { describe, expect, it } from "vitest";

import type { QuoteRequest } from "../../src/core/types/quoteRequest.js";
import { adaptQuoteRequest } from "../../src/protocols/oif/adapters/quoteRequestAdapter.js";

const USER_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8" as Address;
const INPUT_TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address;
const OUTPUT_TOKEN = "0x4200000000000000000000000000000000000006" as Address;
const RECEIVER_ADDRESS = "0x1111111111111111111111111111111111111111" as Address;

const INPUT_CHAIN_ID = 1;
const OUTPUT_CHAIN_ID = 8453;

function toErc7930(chainId: number, address: string): string {
    return encodeAddress(
        { version: 1, chainType: "eip155", chainReference: chainId.toString(), address },
        { format: "hex" },
    ) as string;
}

describe("adaptQuoteRequest", () => {
    const baseRequest: QuoteRequest = {
        user: { chainId: INPUT_CHAIN_ID, address: USER_ADDRESS },
        intent: {
            inputs: [
                {
                    asset: { chainId: INPUT_CHAIN_ID, address: INPUT_TOKEN },
                    amount: "1000000",
                },
            ],
            outputs: [
                {
                    asset: { chainId: OUTPUT_CHAIN_ID, address: OUTPUT_TOKEN },
                },
            ],
        },
    };

    it("converts user to ERC-7930 format", () => {
        const result = adaptQuoteRequest(baseRequest);

        const expectedUserHex = toErc7930(INPUT_CHAIN_ID, USER_ADDRESS);
        expect(result.user).toBe(expectedUserHex);
    });

    it("sets intentType to oif-swap", () => {
        const result = adaptQuoteRequest(baseRequest);
        expect(result.intent.intentType).toBe("oif-swap");
    });

    it("converts input asset to ERC-7930 format", () => {
        const result = adaptQuoteRequest(baseRequest);

        const expectedAssetHex = toErc7930(INPUT_CHAIN_ID, INPUT_TOKEN);
        expect(result.intent.inputs[0]!.asset).toBe(expectedAssetHex);
    });

    it("derives input user from top-level user address on input chain", () => {
        const result = adaptQuoteRequest(baseRequest);

        const expectedInputUserHex = toErc7930(INPUT_CHAIN_ID, USER_ADDRESS);
        expect(result.intent.inputs[0]!.user).toBe(expectedInputUserHex);
    });

    it("preserves input amount", () => {
        const result = adaptQuoteRequest(baseRequest);
        expect(result.intent.inputs[0]!.amount).toBe("1000000");
    });

    it("omits amount when not provided", () => {
        const request: QuoteRequest = {
            ...baseRequest,
            intent: {
                ...baseRequest.intent,
                inputs: [{ asset: { chainId: INPUT_CHAIN_ID, address: INPUT_TOKEN } }],
            },
        };
        const result = adaptQuoteRequest(request);
        expect(result.intent.inputs[0]!.amount).toBeUndefined();
    });

    it("converts output asset to ERC-7930 format", () => {
        const result = adaptQuoteRequest(baseRequest);

        const expectedOutputAssetHex = toErc7930(OUTPUT_CHAIN_ID, OUTPUT_TOKEN);
        expect(result.intent.outputs[0]!.asset).toBe(expectedOutputAssetHex);
    });

    it("defaults output receiver to user on output chain when no recipient", () => {
        const result = adaptQuoteRequest(baseRequest);

        const expectedReceiverHex = toErc7930(OUTPUT_CHAIN_ID, USER_ADDRESS);
        expect(result.intent.outputs[0]!.receiver).toBe(expectedReceiverHex);
    });

    it("uses explicit recipient when provided", () => {
        const request: QuoteRequest = {
            ...baseRequest,
            intent: {
                ...baseRequest.intent,
                outputs: [
                    {
                        asset: { chainId: OUTPUT_CHAIN_ID, address: OUTPUT_TOKEN },
                        recipient: { chainId: OUTPUT_CHAIN_ID, address: RECEIVER_ADDRESS },
                    },
                ],
            },
        };
        const result = adaptQuoteRequest(request);

        const expectedReceiverHex = toErc7930(OUTPUT_CHAIN_ID, RECEIVER_ADDRESS);
        expect(result.intent.outputs[0]!.receiver).toBe(expectedReceiverHex);
    });

    it("preserves output amount when provided", () => {
        const request: QuoteRequest = {
            ...baseRequest,
            intent: {
                ...baseRequest.intent,
                outputs: [
                    {
                        asset: { chainId: OUTPUT_CHAIN_ID, address: OUTPUT_TOKEN },
                        amount: "5000000",
                    },
                ],
            },
        };
        const result = adaptQuoteRequest(request);
        expect(result.intent.outputs[0]!.amount).toBe("5000000");
    });

    it("preserves output calldata when provided", () => {
        const request: QuoteRequest = {
            ...baseRequest,
            intent: {
                ...baseRequest.intent,
                outputs: [
                    {
                        asset: { chainId: OUTPUT_CHAIN_ID, address: OUTPUT_TOKEN },
                        calldata: "0xdeadbeef",
                    },
                ],
            },
        };
        const result = adaptQuoteRequest(request);
        expect(result.intent.outputs[0]!.calldata).toBe("0xdeadbeef");
    });

    it("defaults swapType to exact-input", () => {
        const result = adaptQuoteRequest(baseRequest);
        expect(result.intent.swapType).toBe("exact-input");
    });

    it("preserves explicit swapType", () => {
        const request: QuoteRequest = {
            ...baseRequest,
            intent: { ...baseRequest.intent, swapType: "exact-output" },
        };
        const result = adaptQuoteRequest(request);
        expect(result.intent.swapType).toBe("exact-output");
    });

    describe("supportedLocks → supportedTypes", () => {
        it("returns all OIF order types when no supportedLocks", () => {
            const result = adaptQuoteRequest(baseRequest);
            expect(result.supportedTypes).toContain("oif-escrow-v0");
            expect(result.supportedTypes).toContain("oif-3009-v0");
            expect(result.supportedTypes).toContain("oif-resource-lock-v0");
            expect(result.supportedTypes).toContain("oif-user-open-v0");
        });

        it("maps oif-escrow to escrow + 3009 types", () => {
            const request: QuoteRequest = {
                ...baseRequest,
                supportedLocks: ["oif-escrow"],
            };
            const result = adaptQuoteRequest(request);

            expect(result.supportedTypes).toContain("oif-escrow-v0");
            expect(result.supportedTypes).toContain("oif-3009-v0");
            expect(result.supportedTypes).toContain("oif-user-open-v0");
            expect(result.supportedTypes).not.toContain("oif-resource-lock-v0");
        });

        it("maps compact-resource-lock to resource lock type", () => {
            const request: QuoteRequest = {
                ...baseRequest,
                supportedLocks: ["compact-resource-lock"],
            };
            const result = adaptQuoteRequest(request);

            expect(result.supportedTypes).toContain("oif-resource-lock-v0");
            expect(result.supportedTypes).toContain("oif-user-open-v0");
            expect(result.supportedTypes).not.toContain("oif-escrow-v0");
        });

        it("always includes oif-user-open-v0", () => {
            const request: QuoteRequest = {
                ...baseRequest,
                supportedLocks: ["oif-escrow"],
            };
            const result = adaptQuoteRequest(request);
            expect(result.supportedTypes).toContain("oif-user-open-v0");
        });

        it("combines multiple lock types", () => {
            const request: QuoteRequest = {
                ...baseRequest,
                supportedLocks: ["oif-escrow", "compact-resource-lock"],
            };
            const result = adaptQuoteRequest(request);

            expect(result.supportedTypes).toContain("oif-escrow-v0");
            expect(result.supportedTypes).toContain("oif-3009-v0");
            expect(result.supportedTypes).toContain("oif-resource-lock-v0");
            expect(result.supportedTypes).toContain("oif-user-open-v0");
        });

        it("ignores unknown lock types gracefully", () => {
            const request: QuoteRequest = {
                ...baseRequest,
                supportedLocks: ["unknown-lock"],
            };
            const result = adaptQuoteRequest(request);

            // Should still have user-open
            expect(result.supportedTypes).toContain("oif-user-open-v0");
            expect(result.supportedTypes).toHaveLength(1);
        });
    });
});
