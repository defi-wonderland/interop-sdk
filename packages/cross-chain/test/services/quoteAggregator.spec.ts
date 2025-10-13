import { beforeEach, describe, expect, it } from "vitest";

import type { AcrossOpenParams } from "../../src/interfaces/AcrossProvider.interface.js";
import type { GetQuoteResponse } from "../../src/internal.js";
import { createQuoteAggregator, QuoteAggregator } from "../../src/services/quoteAggregator.js";
import { SortingStrategy } from "../../src/types/sorting.js";

function createMockQuote(
    protocol: string,
    outputAmount: string,
    feeTotal: string,
    feePercent: string,
): GetQuoteResponse<"crossChainTransfer", AcrossOpenParams> {
    return {
        protocol,
        action: "crossChainTransfer",
        isAmountTooLow: false,
        output: {
            sender: "0x1234567890123456789012345678901234567890" as `0x${string}`,
            recipient: "0x1234567890123456789012345678901234567890" as `0x${string}`,
            inputTokenAddress: "0x1234567890123456789012345678901234567890" as `0x${string}`,
            outputTokenAddress: "0x1234567890123456789012345678901234567890" as `0x${string}`,
            inputAmount: "1000000000",
            outputAmount,
            inputChainId: 11155111,
            outputChainId: 84532,
        },
        fee: {
            total: feeTotal,
            percent: feePercent,
        },
        openParams: {
            action: "crossChainTransfer",
            params: {} as unknown,
        } as AcrossOpenParams,
    } as GetQuoteResponse<"crossChainTransfer", AcrossOpenParams>;
}

type AggregatorWithSortQuotes = {
    sortQuotes: (
        quotes: GetQuoteResponse<"crossChainTransfer", AcrossOpenParams>[],
        strategy: SortingStrategy,
    ) => GetQuoteResponse<"crossChainTransfer", AcrossOpenParams>[];
};

function getSortQuotes(aggregator: QuoteAggregator): AggregatorWithSortQuotes["sortQuotes"] {
    return (aggregator as unknown as AggregatorWithSortQuotes).sortQuotes;
}

describe("QuoteAggregator", () => {
    describe("createQuoteAggregator", () => {
        it("should create aggregator with default providers", () => {
            const aggregator = createQuoteAggregator();
            expect(aggregator).toBeInstanceOf(QuoteAggregator);
        });

        it("should create aggregator with specified providers", () => {
            const aggregator = createQuoteAggregator(["across"]);
            expect(aggregator).toBeInstanceOf(QuoteAggregator);
        });
    });

    describe("Sorting Strategies", () => {
        let aggregator: QuoteAggregator;
        let sortQuotes: AggregatorWithSortQuotes["sortQuotes"];
        let threeQuotes: GetQuoteResponse<"crossChainTransfer", AcrossOpenParams>[];

        beforeEach(() => {
            aggregator = createQuoteAggregator(["across"]);
            sortQuotes = getSortQuotes(aggregator);
            threeQuotes = [
                createMockQuote("provider1", "990000000", "10000000", "1.0"),
                createMockQuote("provider2", "995000000", "5000000", "0.5"),
                createMockQuote("provider3", "985000000", "15000000", "1.5"),
            ];
        });

        describe("BEST_OUTPUT", () => {
            it("should sort by highest output amount", async () => {
                const sorted = sortQuotes.call(
                    aggregator,
                    threeQuotes,
                    SortingStrategy.BEST_OUTPUT,
                );

                expect(sorted[0]?.output.outputAmount).toBe("995000000");
                expect(sorted[1]?.output.outputAmount).toBe("990000000");
                expect(sorted[2]?.output.outputAmount).toBe("985000000");
            });
        });

        describe("LOWEST_FEE_AMOUNT", () => {
            it("should sort by lowest absolute fee", async () => {
                const sorted = sortQuotes.call(
                    aggregator,
                    threeQuotes,
                    SortingStrategy.LOWEST_FEE_AMOUNT,
                );

                expect(sorted[0]?.fee.total).toBe("5000000");
                expect(sorted[1]?.fee.total).toBe("10000000");
                expect(sorted[2]?.fee.total).toBe("15000000");
            });
        });

        describe("LOWEST_FEE_PERCENT", () => {
            it("should sort by lowest fee percentage", async () => {
                const sorted = sortQuotes.call(
                    aggregator,
                    threeQuotes,
                    SortingStrategy.LOWEST_FEE_PERCENT,
                );

                expect(sorted[0]?.fee.percent).toBe("0.5");
                expect(sorted[1]?.fee.percent).toBe("1.0");
                expect(sorted[2]?.fee.percent).toBe("1.5");
            });
        });
    });

    describe("Corner Cases", () => {
        let aggregator: QuoteAggregator;
        let sortQuotes: AggregatorWithSortQuotes["sortQuotes"];

        beforeEach(() => {
            aggregator = createQuoteAggregator(["across"]);
            sortQuotes = getSortQuotes(aggregator);
        });

        it("should handle empty quote arrays", async () => {
            const mockQuotes: GetQuoteResponse<"crossChainTransfer", AcrossOpenParams>[] = [];
            const sorted = sortQuotes.call(aggregator, mockQuotes, SortingStrategy.BEST_OUTPUT);

            expect(sorted).toEqual([]);
        });

        it("should handle single quote", async () => {
            const mockQuotes = [createMockQuote("provider1", "990000000", "10000000", "1.0")];
            const sorted = sortQuotes.call(aggregator, mockQuotes, SortingStrategy.BEST_OUTPUT);

            expect(sorted).toHaveLength(1);
            expect(sorted[0]?.protocol).toBe("provider1");
        });
    });

    describe("Default Sorting", () => {
        it("should default to BEST_OUTPUT if no strategy specified", async () => {
            const aggregator = createQuoteAggregator(["across"]);
            const sortQuotes = getSortQuotes(aggregator);

            const mockQuotes = [
                createMockQuote("provider1", "990000000", "10000000", "1.0"),
                createMockQuote("provider2", "995000000", "5000000", "0.5"),
            ];

            const sorted = sortQuotes.call(aggregator, mockQuotes, SortingStrategy.BEST_OUTPUT);

            expect(sorted[0]?.output.outputAmount).toBe("995000000");
            expect(sorted[1]?.output.outputAmount).toBe("990000000");
        });
    });
});
