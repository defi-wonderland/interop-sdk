import { GetQuoteRequest, PostOrderResponse } from "@openintentsframework/oif-specs";
import { EIP1193Provider } from "viem";

import {
    CrossChainProvider,
    ExecutableQuote,
    ProviderNotFound,
    ProviderTimeout,
    SortingStrategy,
} from "../internal.js";

type GetQuotesError = {
    errorMsg: string;
    error: Error;
};

type GetQuotesResponse = (ExecutableQuote | GetQuotesError)[];

interface ProviderExecutorConfig {
    providers: CrossChainProvider[];
    sortingStrategy?: SortingStrategy;
    timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * A service that get quotes in batches and executes cross-chain actions
 * TODO: Improve types declaration to define getQuotesParams interface depending on the selected param parser
 */
class ProviderExecutor {
    private readonly providers: Record<string, CrossChainProvider>;
    private readonly sortingStrategy?: SortingStrategy;
    private readonly timeoutMs: number;
    /**
     * Constructor
     * @param providers - The providers to use
     */
    constructor(config: ProviderExecutorConfig) {
        const { providers, sortingStrategy, timeoutMs } = config;
        this.providers = providers.reduce(
            (acc, provider) => {
                acc[provider.getProviderId()] = provider;
                return acc;
            },
            {} as Record<string, CrossChainProvider>,
        );
        this.sortingStrategy = sortingStrategy;
        this.timeoutMs = timeoutMs ?? DEFAULT_TIMEOUT_MS;
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
        const resultQuotes = await Promise.all(
            Object.values(this.providers).map(async (provider) => {
                try {
                    const quotesPromise = provider.getQuotes(params).then((quotes) =>
                        quotes.map((quote) => ({
                            ...quote,
                            provider: provider.getProviderId(),
                        })),
                    );

                    let timeout: NodeJS.Timeout;

                    const timeoutPromise = new Promise<never>((_, reject) => {
                        timeout = setTimeout(() => {
                            reject(new ProviderTimeout(`Timeout after ${this.timeoutMs}ms`));
                        }, this.timeoutMs);
                    });

                    return Promise.race([quotesPromise, timeoutPromise]).finally(() => {
                        clearTimeout(timeout);
                    });
                } catch (error) {
                    if (error instanceof ProviderTimeout) {
                        return { error: error, errorMsg: error.message };
                    }
                    return {
                        error: new Error(String(error)),
                        errorMsg: (error as Error).message ?? "Unknown error",
                    };
                }
            }),
        ).then((results) => results.flat());

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
        const provider = this.providers[quote.provider ?? ""];
        if (!provider) {
            throw new ProviderNotFound(quote.provider ?? "No provider id in quote");
        }
        return provider.execute(quote, signer);
    }
}

/**
 * Create a provider executor
 * @param providers - The providers to use
 * @param sortingStrategy - The sorting strategy to use
 * @param timeoutMs - The timeout in milliseconds
 * @returns The provider executor
 */
const createProviderExecutor = (config: ProviderExecutorConfig): ProviderExecutor => {
    return new ProviderExecutor(config);
};

export { ProviderExecutor, createProviderExecutor };
