import { TransactionRequest } from "viem";

import {
    BasicOpenParams,
    CrossChainProvider,
    GetQuoteParams,
    GetQuoteResponse,
    ProviderNotFound,
    ValidActions,
} from "../internal.js";

type GetQuotesError = {
    errorMsg: string;
    error: Error;
};

type GetQuotesResponse = (GetQuoteResponse<ValidActions, BasicOpenParams> | GetQuotesError)[];

/**
 * A service that get quotes in batches and executes cross-chain actions
 */
class ProviderExecutor {
    private readonly providers: Record<string, CrossChainProvider<BasicOpenParams>>;

    /**
     * Constructor
     * @param providers - The providers to use
     */
    constructor(providers: CrossChainProvider<BasicOpenParams>[]) {
        this.providers = providers.reduce(
            (acc, provider) => {
                acc[provider.getProtocolName()] = provider;
                return acc;
            },
            {} as Record<string, CrossChainProvider<BasicOpenParams>>,
        );
    }

    /**
     * Get quotes for a cross-chain action from all providers
     * @param action - The action to get quotes for
     * @param params - The parameters for the action
     * @returns The quotes for the action
     */
    async getQuotes<Action extends ValidActions>(
        action: Action,
        params: GetQuoteParams<Action>,
    ): Promise<GetQuotesResponse> {
        const quotes = await Promise.all(
            Object.values(this.providers).map(async (provider) => {
                try {
                    return await provider.getQuote(action, params);
                } catch (error) {
                    if (error instanceof Error) {
                        return {
                            errorMsg: error.message,
                            error,
                        };
                    }
                    return {
                        errorMsg: "Unknown error",
                        error: new Error(String(error)),
                    };
                }
            }),
        );

        return quotes;
    }

    /**
     * Execute a cross-chain action
     * @param quote - The quote to execute
     * @returns The transaction requests for the action
     */
    async execute(
        quote: GetQuoteResponse<ValidActions, BasicOpenParams>,
    ): Promise<TransactionRequest[]> {
        const provider = this.providers[quote.protocol];
        if (!provider) {
            throw new ProviderNotFound(quote.protocol);
        }
        return provider.simulateOpen(quote.openParams);
    }
}

/**
 * Create a provider executor
 * @param providers - The providers to use
 * @returns The provider executor
 */
const createProviderExecutor = (
    providers: CrossChainProvider<BasicOpenParams>[],
): ProviderExecutor => {
    return new ProviderExecutor(providers);
};

export { ProviderExecutor, createProviderExecutor };
