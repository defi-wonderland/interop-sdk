import { beforeEach, describe, expect, it } from "vitest";

import type { AcrossOpenParams } from "../../src/interfaces/AcrossProvider.interface.js";
import type { GetQuoteResponse, QuoteResult } from "../../src/internal.js";
import { QuoteResultStatus } from "../../src/interfaces/quoteAggregator.interface.js";
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

function createMockQuoteResult(
    provider: string,
    outputAmount: string,
    feeTotal: string,
    feePercent: string,
): QuoteResult<"crossChainTransfer", AcrossOpenParams> {
    return {
        provider,
        status: QuoteResultStatus.SUCCESS,
        quote: createMockQuote(provider, outputAmount, feeTotal, feePercent),
    };
}

type AggregatorWithSortQuoteResults = {
    sortQuoteResults: (
        results: QuoteResult<"crossChainTransfer", AcrossOpenParams>[],
        strategy: SortingStrategy,
    ) => QuoteResult<"crossChainTransfer", AcrossOpenParams>[];
};

function getSortQuoteResults(
    aggregator: QuoteAggregator,
): AggregatorWithSortQuoteResults["sortQuoteResults"] {
    return (aggregator as unknown as AggregatorWithSortQuoteResults).sortQuoteResults;
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
        let sortQuoteResults: AggregatorWithSortQuoteResults["sortQuoteResults"];
        let threeQuoteResults: QuoteResult<"crossChainTransfer", AcrossOpenParams>[];

        beforeEach(() => {
            aggregator = createQuoteAggregator(["across"]);
            sortQuoteResults = getSortQuoteResults(aggregator);
            threeQuoteResults = [
                createMockQuoteResult("provider1", "990000000", "10000000", "1.0"),
                createMockQuoteResult("provider2", "995000000", "5000000", "0.5"),
                createMockQuoteResult("provider3", "985000000", "15000000", "1.5"),
            ];
        });

        describe("BEST_OUTPUT", () => {
            it("should sort by highest output amount", async () => {
                const sorted = sortQuoteResults.call(
                    aggregator,
                    threeQuoteResults,
                    SortingStrategy.BEST_OUTPUT,
                );

                expect(sorted[0]?.quote?.output.outputAmount).toBe("995000000");
                expect(sorted[1]?.quote?.output.outputAmount).toBe("990000000");
                expect(sorted[2]?.quote?.output.outputAmount).toBe("985000000");
            });
        });

        describe("LOWEST_FEE_AMOUNT", () => {
            it("should sort by lowest absolute fee", async () => {
                const sorted = sortQuoteResults.call(
                    aggregator,
                    threeQuoteResults,
                    SortingStrategy.LOWEST_FEE_AMOUNT,
                );

                expect(sorted[0]?.quote?.fee.total).toBe("5000000");
                expect(sorted[1]?.quote?.fee.total).toBe("10000000");
                expect(sorted[2]?.quote?.fee.total).toBe("15000000");
            });
        });

        describe("LOWEST_FEE_PERCENT", () => {
            it("should sort by lowest fee percentage", async () => {
                const sorted = sortQuoteResults.call(
                    aggregator,
                    threeQuoteResults,
                    SortingStrategy.LOWEST_FEE_PERCENT,
                );

                expect(sorted[0]?.quote?.fee.percent).toBe("0.5");
                expect(sorted[1]?.quote?.fee.percent).toBe("1.0");
                expect(sorted[2]?.quote?.fee.percent).toBe("1.5");
            });
        });
    });

    describe("Corner Cases", () => {
        let aggregator: QuoteAggregator;
        let sortQuoteResults: AggregatorWithSortQuoteResults["sortQuoteResults"];

        beforeEach(() => {
            aggregator = createQuoteAggregator(["across"]);
            sortQuoteResults = getSortQuoteResults(aggregator);
        });

        it("should handle empty quote arrays", async () => {
            const mockQuoteResults: QuoteResult<"crossChainTransfer", AcrossOpenParams>[] = [];
            const sorted = sortQuoteResults.call(
                aggregator,
                mockQuoteResults,
                SortingStrategy.BEST_OUTPUT,
            );

            expect(sorted).toEqual([]);
        });

        it("should handle single quote", async () => {
            const mockQuoteResults = [
                createMockQuoteResult("provider1", "990000000", "10000000", "1.0"),
            ];
            const sorted = sortQuoteResults.call(
                aggregator,
                mockQuoteResults,
                SortingStrategy.BEST_OUTPUT,
            );

            expect(sorted).toHaveLength(1);
            expect(sorted[0]?.provider).toBe("provider1");
        });

        it("should sort successful quotes before failed quotes", async () => {
            const mockQuoteResults: QuoteResult<"crossChainTransfer", AcrossOpenParams>[] = [
                createMockQuoteResult("provider1", "990000000", "10000000", "1.0"),
                { provider: "provider2", status: QuoteResultStatus.ERROR, error: "Failed" },
                createMockQuoteResult("provider3", "995000000", "5000000", "0.5"),
            ];

            const sorted = sortQuoteResults.call(
                aggregator,
                mockQuoteResults,
                SortingStrategy.BEST_OUTPUT,
            );

            expect(sorted[0]?.status).toBe(QuoteResultStatus.SUCCESS);
            expect(sorted[1]?.status).toBe(QuoteResultStatus.SUCCESS);
            expect(sorted[2]?.status).toBe(QuoteResultStatus.ERROR);
        });
    });

    describe("Default Sorting", () => {
        it("should default to BEST_OUTPUT if no strategy specified", async () => {
            const aggregator = createQuoteAggregator(["across"]);
            const sortQuoteResults = getSortQuoteResults(aggregator);

            const mockQuoteResults = [
                createMockQuoteResult("provider1", "990000000", "10000000", "1.0"),
                createMockQuoteResult("provider2", "995000000", "5000000", "0.5"),
            ];

            const sorted = sortQuoteResults.call(
                aggregator,
                mockQuoteResults,
                SortingStrategy.BEST_OUTPUT,
            );

            expect(sorted[0]?.quote?.output.outputAmount).toBe("995000000");
            expect(sorted[1]?.quote?.output.outputAmount).toBe("990000000");
        });
    });
});
