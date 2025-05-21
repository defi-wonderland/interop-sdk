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

class ProviderExecutor {
    private readonly providers: Record<string, CrossChainProvider<BasicOpenParams>>;

    constructor(providers: CrossChainProvider<BasicOpenParams>[]) {
        this.providers = providers.reduce(
            (acc, provider) => {
                acc[provider.getProtocolName()] = provider;
                return acc;
            },
            {} as Record<string, CrossChainProvider<BasicOpenParams>>,
        );
    }

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

const createProviderExecutor = (
    providers: CrossChainProvider<BasicOpenParams>[],
): ProviderExecutor => {
    return new ProviderExecutor(providers);
};

export { ProviderExecutor, createProviderExecutor };
