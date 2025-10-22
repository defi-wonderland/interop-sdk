import type { GetQuotesParams, QuoteResult } from "../interfaces/quoteAggregator.interface.js";
import type {
    BasicOpenParams,
    CrossChainProvider,
    GetQuoteResponse,
    SupportedProtocols,
    ValidActions,
} from "../internal.js";
import type { SortingStrategy } from "../types/sorting.js";
import { QuoteResultStatus } from "../interfaces/quoteAggregator.interface.js";
import { PROTOCOLS } from "../types.js";
import { SortingCriteria } from "../types/sorting.js";
import { CrossChainProviderFactory } from "./crossChainProviderFactory.js";

/**
 * Default timeout for provider quote requests in milliseconds
 */
const DEFAULT_QUOTE_TIMEOUT_MS = 10000;

/**
 * Quote aggregator for fetching and comparing quotes from multiple providers
 */
export class QuoteAggregator {
    private providers: Map<string, CrossChainProvider<BasicOpenParams>>;

    constructor(providers?: SupportedProtocols[]) {
        this.providers = new Map();
        const providerNames: SupportedProtocols[] = !!providers?.length
            ? providers
            : [PROTOCOLS.ACROSS];

        for (const name of providerNames) {
            const provider = CrossChainProviderFactory.build(name);
            this.providers.set(name, provider);
        }
    }

    /**
     * Get quotes from multiple providers, sorted by the specified strategy
     * @param params - Parameters for fetching quotes
     * @returns Array of quote results sorted by strategy (successful quotes first, then failed)
     */
    async getQuotes<Action extends ValidActions, OpenParams extends BasicOpenParams>(
        params: GetQuotesParams<Action>,
    ): Promise<QuoteResult<Action, OpenParams>[]> {
        const sortingStrategy = params.sorting || SortingCriteria.BEST_OUTPUT;
        const timeoutMs = params.timeout || DEFAULT_QUOTE_TIMEOUT_MS;

        const quotePromises = Array.from(this.providers.entries()).map(
            async ([providerName, provider]): Promise<QuoteResult<Action, OpenParams>> => {
                try {
                    const quotePromise = provider.getQuote(params.action, params.params);
                    const timeoutPromise = new Promise<never>((_, reject) => {
                        setTimeout(() => {
                            reject(new Error(`Timeout after ${timeoutMs}ms`));
                        }, timeoutMs);
                    });

                    const quote = await Promise.race([quotePromise, timeoutPromise]);

                    return {
                        provider: providerName,
                        status: QuoteResultStatus.SUCCESS,
                        quote: quote as GetQuoteResponse<Action, OpenParams>,
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    const isTimeout = errorMessage.includes("Timeout");

                    console.error(
                        `Provider ${providerName} ${isTimeout ? "timed out" : "failed"}:`,
                        error,
                    );

                    return {
                        provider: providerName,
                        status: isTimeout ? QuoteResultStatus.TIMEOUT : QuoteResultStatus.ERROR,
                        error: errorMessage,
                    };
                }
            },
        );

        const results = await Promise.allSettled(quotePromises);

        const allResults: QuoteResult<Action, OpenParams>[] = [];
        for (const result of results) {
            if (result.status === "fulfilled") {
                allResults.push(result.value);
            } else {
                // This should rarely happen since we catch errors inside the promise
                const error =
                    result.reason instanceof Error ? result.reason.message : String(result.reason);
                allResults.push({
                    provider: "unknown",
                    status: QuoteResultStatus.ERROR,
                    error,
                });
            }
        }

        return this.sortQuoteResults(allResults, sortingStrategy);
    }

    /**
     * Sort quote results by the specified strategy
     * Successful quotes are sorted first, followed by failed quotes
     */
    private sortQuoteResults<Action extends ValidActions, OpenParams extends BasicOpenParams>(
        results: QuoteResult<Action, OpenParams>[],
        strategy: SortingStrategy,
    ): QuoteResult<Action, OpenParams>[] {
        const successResults: QuoteResult<Action, OpenParams>[] = [];
        const failedResults: QuoteResult<Action, OpenParams>[] = [];

        for (const result of results) {
            if (result.status === QuoteResultStatus.SUCCESS && result.quote) {
                successResults.push(result);
            } else {
                failedResults.push(result);
            }
        }

        this.sortByStrategy(successResults, strategy);

        return [...successResults, ...failedResults];
    }

    /**
     * Sort quotes in place by the specified strategy
     */
    private sortByStrategy<Action extends ValidActions, OpenParams extends BasicOpenParams>(
        results: QuoteResult<Action, OpenParams>[],
        strategy: SortingStrategy,
    ): void {
        if (typeof strategy === "function") {
            results.sort(strategy);
            return;
        }

        results.sort((a, b) => {
            if (!a.quote || !b.quote) return 0;

            switch (strategy) {
                case SortingCriteria.BEST_OUTPUT: {
                    const aOut = BigInt(a.quote.output.outputAmount);
                    const bOut = BigInt(b.quote.output.outputAmount);
                    return bOut > aOut ? 1 : bOut < aOut ? -1 : 0;
                }

                case SortingCriteria.LOWEST_FEE_AMOUNT: {
                    const aFee = BigInt(a.quote.fee.total);
                    const bFee = BigInt(b.quote.fee.total);
                    return aFee > bFee ? 1 : aFee < bFee ? -1 : 0;
                }

                case SortingCriteria.LOWEST_FEE_PERCENT: {
                    return parseFloat(a.quote.fee.percent) - parseFloat(b.quote.fee.percent);
                }

                default:
                    return 0;
            }
        });
    }
}

/**
 * Factory function to create a quote aggregator
 * @param providers - List of provider names to use
 * @returns QuoteAggregator instance
 */
export function createQuoteAggregator(providers?: SupportedProtocols[]): QuoteAggregator {
    return new QuoteAggregator(providers);
}
