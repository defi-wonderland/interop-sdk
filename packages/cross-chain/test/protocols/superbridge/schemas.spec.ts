import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
    SuperbridgeActivityResponseSchema,
    SuperbridgeRoutesRequestSchema,
    SuperbridgeRoutesResponseSchema,
    SuperbridgeSubmitGaslessResponseSchema,
    SuperbridgeTokensResponseSchema,
} from "../../../src/protocols/superbridge/schemas.js";

const ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

describe("SuperbridgeRoutesRequestSchema", () => {
    it("parses a valid routes request", () => {
        const request = {
            fromChainId: "1",
            toChainId: "8453",
            fromTokenAddress: ADDRESS,
            toTokenAddress: ADDRESS,
            amount: "1000000",
            slippage: 0,
        } satisfies z.input<typeof SuperbridgeRoutesRequestSchema>;

        const parsed = SuperbridgeRoutesRequestSchema.parse(request);

        expect(parsed.amount).toBe("1000000");
        expect(parsed.slippage).toBe(0);
    });

    it("rejects a request missing the amount", () => {
        expect(() =>
            SuperbridgeRoutesRequestSchema.parse({
                fromTokenAddress: ADDRESS,
                toTokenAddress: ADDRESS,
                slippage: 0,
            }),
        ).toThrow();
    });
});

describe("SuperbridgeRoutesResponseSchema", () => {
    it("parses a response with a quote result and an error result", () => {
        const response = {
            results: [
                {
                    meta: { id: "op-deposit-cdm", provider: { name: "optimism" } },
                    result: {
                        initiatingTransaction: {
                            type: "evm",
                            chainId: "1",
                            to: ADDRESS,
                            data: "0xfeed",
                        },
                        token: { address: ADDRESS, chainId: "1", symbol: "USDC", decimals: 6 },
                        receiveToken: {
                            address: ADDRESS,
                            chainId: "8453",
                            symbol: "USDC",
                            decimals: 6,
                        },
                        receive: "995",
                        duration: 120,
                    },
                },
                { result: { type: "AmountTooLarge", maximum: "1000000" } },
            ],
        } satisfies z.input<typeof SuperbridgeRoutesResponseSchema>;

        const parsed = SuperbridgeRoutesResponseSchema.parse(response);

        expect(parsed.results).toHaveLength(2);
        expect(parsed.results[0]!.meta?.id).toBe("op-deposit-cdm");
        expect(parsed.results[1]!.result).toMatchObject({ type: "AmountTooLarge" });
    });
});

describe("SuperbridgeActivityResponseSchema", () => {
    it("parses an activity item with transaction and wait steps", () => {
        const activity = [
            {
                id: "bridge-1",
                type: "bridge",
                fromChainId: "1",
                toChainId: "8453",
                steps: [
                    {
                        type: "transaction",
                        transactionStatus: "done",
                        confirmation: { transactionHash: "0xabc", status: "confirmed" },
                    },
                    {
                        type: "wait",
                        waitStatus: "in-progress",
                        waitType: "op-challenge-period",
                        expectedDuration: 604800000,
                    },
                ],
            },
        ] satisfies z.input<typeof SuperbridgeActivityResponseSchema>;

        const [parsed] = SuperbridgeActivityResponseSchema.parse(activity);

        expect(parsed!.id).toBe("bridge-1");
        expect(parsed!.steps).toHaveLength(2);
    });

    it("rejects a transaction step with an unknown status", () => {
        expect(() =>
            SuperbridgeActivityResponseSchema.parse([
                { id: "bridge-1", steps: [{ type: "transaction", transactionStatus: "bogus" }] },
            ]),
        ).toThrow();
    });
});

describe("SuperbridgeSubmitGaslessResponseSchema", () => {
    it("parses a submission response", () => {
        const parsed = SuperbridgeSubmitGaslessResponseSchema.parse({
            txHash: "0xabc",
            status: "submitted",
        });

        expect(parsed.txHash).toBe("0xabc");
    });
});

describe("SuperbridgeTokensResponseSchema", () => {
    it("parses a paginated tokens page", () => {
        const page = {
            tokens: [{ address: ADDRESS, chainId: "1", symbol: "USDC", decimals: 6 }],
            nextCursor: "next-page",
        } satisfies z.input<typeof SuperbridgeTokensResponseSchema>;

        const parsed = SuperbridgeTokensResponseSchema.parse(page);

        expect(parsed.tokens).toHaveLength(1);
        expect(parsed.nextCursor).toBe("next-page");
    });

    it("accepts a null cursor on the final page", () => {
        const parsed = SuperbridgeTokensResponseSchema.parse({ tokens: [], nextCursor: null });

        expect(parsed.nextCursor).toBeNull();
    });
});
