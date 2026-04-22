import type { Address, Chain } from "viem";
import { encodeFunctionData, erc20Abi, maxUint256 } from "viem";
import { describe, expect, it, vi } from "vitest";

import type {
    AllowanceEntry,
    AllowanceReader,
    AllowanceResult,
} from "../../../src/core/interfaces/approval.interface.js";
import type { ExecutableQuote } from "../../../src/core/schemas/quote.js";
import type { PublicClientManager } from "../../../src/core/utils/publicClientManager.js";
import { allowanceKey } from "../../../src/core/interfaces/approval.interface.js";
import { DefaultApprovalService } from "../../../src/core/services/approval/DefaultApprovalService.js";
import { ExactAmountStrategy } from "../../../src/core/services/approval/ExactAmountStrategy.js";
import { InfiniteAmountStrategy } from "../../../src/core/services/approval/InfiniteAmountStrategy.js";
import { MulticallAllowanceReader } from "../../../src/core/services/approval/MulticallAllowanceReader.js";

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

    it("prepends an ApprovalStep when allowance is insufficient", async () => {
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
        if (step.kind !== "approval") throw new Error("expected approval step");
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
        if (step.kind !== "approval") throw new Error("expected approval step");
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

    // Guards against a chain allowlist regression: the real reader and
    // real chain lookup are wired together; only the RPC client is mocked.
    // If a curated allowlist ever comes back, the approval step disappears
    // and this test fails.
    it("prepends an approval step on mainnet when the allowance is zero", async () => {
        const usdcMainnet = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address;
        const acrossSpender = "0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5" as Address;
        const owner = "0x000000000000000000000000000000000000dEaD" as Address;
        const required = 5_000_000n;

        const multicall = vi.fn(async () => [{ status: "success", result: 0n }]);
        const getClient = vi.fn((chain: Chain) => {
            expect(chain.id).toBe(1);
            return { multicall };
        });
        const clientManager = { getClient } as unknown as PublicClientManager;

        const reader = new MulticallAllowanceReader(clientManager);
        const service = new DefaultApprovalService(reader, new ExactAmountStrategy());

        const quote: ExecutableQuote = {
            order: {
                steps: [
                    {
                        kind: "transaction",
                        chainId: 1,
                        transaction: { to: acrossSpender, data: "0xdeadbeef" },
                    },
                ],
                checks: {
                    allowances: [
                        {
                            chainId: 1,
                            tokenAddress: usdcMainnet,
                            owner,
                            spender: acrossSpender,
                            required: required.toString(),
                        },
                    ],
                },
            },
            preview: {
                inputs: [
                    {
                        chainId: 1,
                        accountAddress: owner,
                        assetAddress: usdcMainnet,
                        amount: required.toString(),
                    },
                ],
                outputs: [
                    {
                        chainId: 42161,
                        accountAddress: owner,
                        assetAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                        amount: required.toString(),
                    },
                ],
            },
            provider: "across",
            _providerId: "across",
        };

        const [enriched] = await service.enrichQuotes([quote]);

        expect(enriched!.order.steps).toHaveLength(2);
        const approvalStep = enriched!.order.steps[0]!;
        if (approvalStep.kind !== "approval") throw new Error("expected approval step");
        expect(approvalStep.chainId).toBe(1);
        expect(approvalStep.transaction.to).toBe(usdcMainnet);
        expect(approvalStep.description).toBe("Token approval");
        expect(approvalStep.transaction.data).toBe(
            encodeFunctionData({
                abi: erc20Abi,
                functionName: "approve",
                args: [acrossSpender, required],
            }),
        );
        expect(getClient).toHaveBeenCalledTimes(1);
        expect(multicall).toHaveBeenCalledTimes(1);
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
