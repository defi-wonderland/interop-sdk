import type { Address } from "viem";
import { encodeFunctionData, erc20Abi, maxUint256 } from "viem";
import { describe, expect, it, vi } from "vitest";

import type {
    AllowanceEntry,
    AllowanceReader,
    AllowanceResult,
} from "../../../src/core/interfaces/approval.interface.js";
import type { ExecutableQuote } from "../../../src/core/schemas/quote.js";
import { allowanceKey } from "../../../src/core/interfaces/approval.interface.js";
import { DefaultApprovalService } from "../../../src/core/services/approval/DefaultApprovalService.js";
import { ExactAmountStrategy } from "../../../src/core/services/approval/ExactAmountStrategy.js";
import { InfiniteAmountStrategy } from "../../../src/core/services/approval/InfiniteAmountStrategy.js";

const TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address;
const OWNER = "0x0000000000000000000000000000000000000001" as Address;
const SPENDER = "0x0000000000000000000000000000000000000002" as Address;
const CHAIN_ID = 1;

function makeQuote(
    overrides: {
        allowances?: {
            chainId: number;
            tokenAddress: string;
            owner: string;
            spender: string;
            required: string;
            preferInfinite?: boolean;
        }[];
        steps?: ExecutableQuote["order"]["steps"];
    } = {},
): ExecutableQuote {
    return {
        order: {
            steps: overrides.steps ?? [
                {
                    kind: "transaction",
                    chainId: CHAIN_ID,
                    transaction: { to: SPENDER, data: "0x" },
                },
            ],
            checks: overrides.allowances ? { allowances: overrides.allowances } : undefined,
        },
        preview: {
            inputs: [
                { chainId: CHAIN_ID, accountAddress: OWNER, assetAddress: TOKEN, amount: "1000" },
            ],
            outputs: [
                { chainId: CHAIN_ID, accountAddress: OWNER, assetAddress: TOKEN, amount: "1000" },
            ],
        },
        provider: "test",
        _providerId: "test",
    };
}

function mockReader(map: Map<string, bigint | null>): AllowanceReader {
    return {
        readAllowances: vi.fn(
            async (entries: AllowanceEntry[]): Promise<AllowanceResult[]> =>
                entries.map((entry) => ({
                    entry,
                    allowance: map.get(allowanceKey(entry)) ?? null,
                })),
        ),
    };
}

const testKey = allowanceKey({
    chainId: CHAIN_ID,
    tokenAddress: TOKEN,
    owner: OWNER,
    spender: SPENDER,
});

// ── Strategies ──────────────────────────────────────────

describe("ExactAmountStrategy", () => {
    it("returns the required amount unchanged", () => {
        expect(new ExactAmountStrategy().resolve(500n)).toBe(500n);
    });
});

describe("InfiniteAmountStrategy", () => {
    it("returns maxUint256 regardless of input", () => {
        expect(new InfiniteAmountStrategy().resolve(500n)).toBe(maxUint256);
    });
});

// ── DefaultApprovalService ──────────────────────────────

describe("DefaultApprovalService", () => {
    it("skips reader call when no quotes have allowance checks", async () => {
        const reader = mockReader(new Map());
        const service = new DefaultApprovalService(reader, new ExactAmountStrategy());

        const result = await service.enrichQuotes([makeQuote()]);

        expect(result).toEqual([makeQuote()]);
        expect(reader.readAllowances).not.toHaveBeenCalled();
    });

    it("does not add a step when on-chain allowance covers the required amount", async () => {
        const reader = mockReader(new Map([[testKey, 2000n]]));
        const service = new DefaultApprovalService(reader, new ExactAmountStrategy());
        const quote = makeQuote({
            allowances: [
                {
                    chainId: CHAIN_ID,
                    tokenAddress: TOKEN,
                    owner: OWNER,
                    spender: SPENDER,
                    required: "1000",
                },
            ],
        });

        const [enriched] = await service.enrichQuotes([quote]);

        expect(enriched!.order.steps).toHaveLength(1);
    });

    it("prepends an approve TransactionStep when allowance is insufficient", async () => {
        const reader = mockReader(new Map([[testKey, 0n]]));
        const service = new DefaultApprovalService(reader, new ExactAmountStrategy());
        const quote = makeQuote({
            allowances: [
                {
                    chainId: CHAIN_ID,
                    tokenAddress: TOKEN,
                    owner: OWNER,
                    spender: SPENDER,
                    required: "1000",
                },
            ],
        });

        const [enriched] = await service.enrichQuotes([quote]);

        expect(enriched!.order.steps).toHaveLength(2);
        const step = enriched!.order.steps[0]!;
        if (step.kind !== "transaction") throw new Error("expected transaction step");
        expect(step.chainId).toBe(CHAIN_ID);
        expect(step.transaction.to).toBe(TOKEN);
        expect(step.description).toBe("Token approval");
        expect(step.transaction.data).toBe(
            encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [SPENDER, 1000n] }),
        );
    });

    it("forwards gas limit to the approval step when configured", async () => {
        const reader = mockReader(new Map([[testKey, 0n]]));
        const service = new DefaultApprovalService(reader, new ExactAmountStrategy(), 100_000n);
        const quote = makeQuote({
            allowances: [
                {
                    chainId: CHAIN_ID,
                    tokenAddress: TOKEN,
                    owner: OWNER,
                    spender: SPENDER,
                    required: "500",
                },
            ],
        });

        const [enriched] = await service.enrichQuotes([quote]);

        const step = enriched!.order.steps[0]!;
        if (step.kind !== "transaction") throw new Error("expected transaction step");
        expect(step.transaction.gas).toBe("100000");
    });

    it("does not mutate the original quote object", async () => {
        const reader = mockReader(new Map([[testKey, 0n]]));
        const service = new DefaultApprovalService(reader, new ExactAmountStrategy());
        const quote = makeQuote({
            allowances: [
                {
                    chainId: CHAIN_ID,
                    tokenAddress: TOKEN,
                    owner: OWNER,
                    spender: SPENDER,
                    required: "1000",
                },
            ],
        });
        const stepsBefore = quote.order.steps.length;

        await service.enrichQuotes([quote]);

        expect(quote.order.steps).toHaveLength(stepsBefore);
    });

    it("leaves the quote unchanged when the allowance read returned null", async () => {
        const reader = mockReader(new Map([[testKey, null]]));
        const service = new DefaultApprovalService(reader, new ExactAmountStrategy());
        const quote = makeQuote({
            allowances: [
                {
                    chainId: CHAIN_ID,
                    tokenAddress: TOKEN,
                    owner: OWNER,
                    spender: SPENDER,
                    required: "1000",
                },
            ],
        });

        const [enriched] = await service.enrichQuotes([quote]);

        expect(enriched!.order.steps).toHaveLength(1);
    });

    it("returns quotes unchanged when the reader throws", async () => {
        const reader: AllowanceReader = {
            readAllowances: vi.fn(async () => {
                throw new Error("RPC down");
            }),
        };
        const service = new DefaultApprovalService(reader, new ExactAmountStrategy());
        const quote = makeQuote({
            allowances: [
                {
                    chainId: CHAIN_ID,
                    tokenAddress: TOKEN,
                    owner: OWNER,
                    spender: SPENDER,
                    required: "1000",
                },
            ],
        });

        const result = await service.enrichQuotes([quote]);

        expect(result).toEqual([quote]);
    });

    it("approves maxUint256 for preferInfinite entries regardless of strategy", async () => {
        const reader = mockReader(new Map([[testKey, 0n]]));
        const service = new DefaultApprovalService(reader, new ExactAmountStrategy());
        const quote = makeQuote({
            allowances: [
                {
                    chainId: CHAIN_ID,
                    tokenAddress: TOKEN,
                    owner: OWNER,
                    spender: SPENDER,
                    required: "1000",
                    preferInfinite: true,
                },
            ],
        });

        const [enriched] = await service.enrichQuotes([quote]);

        const step = enriched!.order.steps[0]!;
        if (step.kind !== "transaction") throw new Error("expected transaction step");
        expect(step.transaction.data).toBe(
            encodeFunctionData({
                abi: erc20Abi,
                functionName: "approve",
                args: [SPENDER, maxUint256],
            }),
        );
    });

    it("deduplicates allowance reads when multiple quotes share the same entry", async () => {
        const reader = mockReader(new Map([[testKey, 0n]]));
        const service = new DefaultApprovalService(reader, new ExactAmountStrategy());
        const quoteA = makeQuote({
            allowances: [
                {
                    chainId: CHAIN_ID,
                    tokenAddress: TOKEN,
                    owner: OWNER,
                    spender: SPENDER,
                    required: "1000",
                },
            ],
        });
        const quoteB = makeQuote({
            allowances: [
                {
                    chainId: CHAIN_ID,
                    tokenAddress: TOKEN,
                    owner: OWNER,
                    spender: SPENDER,
                    required: "2000",
                },
            ],
        });

        await service.enrichQuotes([quoteA, quoteB]);

        const entries = (reader.readAllowances as ReturnType<typeof vi.fn>).mock
            .calls[0]![0] as AllowanceEntry[];
        expect(entries).toHaveLength(1);
    });
});
