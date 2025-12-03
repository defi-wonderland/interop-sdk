import { GetQuoteRequest, PostOrderResponse } from "@wonderland/interop-oif-specs";
import { EIP1193Provider } from "viem";

import { CrossChainProvider, ExecutableQuote, SortingStrategy } from "../internal.js";

type GetQuotesError = {
    errorMsg: string;
    error: Error;
};

type GetQuotesResponse = (ExecutableQuote | GetQuotesError)[];

interface ProviderExecutorConfig {
    providers: CrossChainProvider[];
    sortingStrategy?: SortingStrategy;
}

/**
 * A service that get quotes in batches and executes cross-chain actions
 * TODO: Improve types declaration to define getQuotesParams interface depending on the selected param parser
 */
class ProviderExecutor {
    private readonly providers: Record<string, CrossChainProvider>;
    private readonly sortingStrategy?: SortingStrategy;
    /**
     * Constructor
     * @param providers - The providers to use
     */
    constructor(config: ProviderExecutorConfig) {
        const { providers, sortingStrategy } = config;
        this.providers = providers.reduce(
            (acc, provider) => {
                acc[provider.getProviderId()] = provider;
                return acc;
            },
            {} as Record<string, CrossChainProvider>,
        );
        this.sortingStrategy = sortingStrategy;
    }

    private filterNonErrors(quotes: GetQuotesResponse): ExecutableQuote[] {
        return quotes.filter((quote) => "order" in quote);
    }

    private filterErrors(quotes: GetQuotesResponse): GetQuotesError[] {
        return quotes.filter((quote) => "error" in quote);
    }

    /**
     * Get quotes for a cross-chain action from all providers
     * @param action - The action to get quotes for
     * @param params - The parameters for the action
     * @returns The quotes for the action
     */
    async getQuotes(params: GetQuoteRequest): Promise<GetQuotesResponse> {
        const resultQuotes: GetQuotesResponse = [];

        for (const provider of Object.values(this.providers)) {
            try {
                const quotes = await provider.getQuotes(params);
                resultQuotes.push(...quotes);
            } catch (error) {
                resultQuotes.push({
                    errorMsg: "Unknown error",
                    error: new Error(String(error)),
                });
            }
        }

        if (this.sortingStrategy) {
            const nonErrors = this.filterNonErrors(resultQuotes);
            const errors = this.filterErrors(resultQuotes);

            return [...this.sortingStrategy.sort(nonErrors), ...errors];
        }
        return resultQuotes;
    }

    /**
     * Execute a cross-chain action
     * @param quote - The quote to execute
     * @returns The transaction requests for the action
     */
    async execute(quote: ExecutableQuote, signer: EIP1193Provider): Promise<PostOrderResponse> {
        return quote.execute(signer);
    }
}

/**
 * Create a provider executor
 * @param providers - The providers to use
 * @returns The provider executor
 */
const createProviderExecutor = (config: ProviderExecutorConfig): ProviderExecutor => {
    return new ProviderExecutor(config);
};

export { ProviderExecutor, createProviderExecutor };
