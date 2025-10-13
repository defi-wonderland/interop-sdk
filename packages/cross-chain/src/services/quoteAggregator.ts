import type { GetQuotesParams } from "../interfaces/quoteAggregator.interface.js";
import type {
    BasicOpenParams,
    CrossChainProvider,
    GetQuoteResponse,
    SupportedProtocols,
    ValidActions,
} from "../internal.js";
import { PROTOCOLS } from "../types.js";
import { SortingStrategy } from "../types/sorting.js";
import { CrossChainProviderFactory } from "./crossChainProviderFactory.js";

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
     * @returns Array of quotes sorted by strategy (first element is best)
     */
    async getQuotes<Action extends ValidActions, OpenParams extends BasicOpenParams>(
        params: GetQuotesParams<Action>,
    ): Promise<GetQuoteResponse<Action, OpenParams>[]> {
        const quotePromises = Array.from(this.providers.entries()).map(
            async ([providerName, provider]) => {
                try {
                    return await provider.getQuote(params.action, params.params);
                } catch (error) {
                    console.error(`Provider ${providerName} failed:`, error);
                    return null;
                }
            },
        );

        const results = await Promise.allSettled(quotePromises);

        const validQuotes: GetQuoteResponse<Action, OpenParams>[] = [];
        for (const result of results) {
            if (result.status === "fulfilled" && result.value !== null) {
                validQuotes.push(result.value as GetQuoteResponse<Action, OpenParams>);
            }
        }

        const sortingStrategy = params.sorting || SortingStrategy.BEST_OUTPUT;
        return this.sortQuotes(validQuotes, sortingStrategy);
    }

    /**
     * Sort quotes by the specified strategy
     */
    private sortQuotes<Action extends ValidActions, OpenParams extends BasicOpenParams>(
        quotes: GetQuoteResponse<Action, OpenParams>[],
        strategy: SortingStrategy,
    ): GetQuoteResponse<Action, OpenParams>[] {
        const sorted = [...quotes];

        switch (strategy) {
            case SortingStrategy.BEST_OUTPUT: {
                return sorted.sort((a, b) => {
                    const aOut = BigInt(a.output.outputAmount);
                    const bOut = BigInt(b.output.outputAmount);
                    return bOut > aOut ? 1 : bOut < aOut ? -1 : 0;
                });
            }

            case SortingStrategy.LOWEST_FEE_AMOUNT: {
                return sorted.sort((a, b) => {
                    const aFee = BigInt(a.fee.total);
                    const bFee = BigInt(b.fee.total);
                    return aFee > bFee ? 1 : aFee < bFee ? -1 : 0;
                });
            }

            case SortingStrategy.LOWEST_FEE_PERCENT: {
                return sorted.sort((a, b) => parseFloat(a.fee.percent) - parseFloat(b.fee.percent));
            }

            default:
                return sorted;
        }
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
