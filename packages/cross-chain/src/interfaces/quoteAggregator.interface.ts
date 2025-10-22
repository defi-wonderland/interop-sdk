import type {
    BasicOpenParams,
    GetQuoteParams,
    GetQuoteResponse,
    ValidActions,
} from "../internal.js";
import type { SortingStrategy } from "../types/sorting.js";

/**
 * Parameters for getting quotes from multiple providers
 */
export interface GetQuotesParams<Action extends ValidActions> {
    /**
     * The action type (crossChainTransfer or crossChainSwap)
     */
    action: Action;

    /**
     * Parameters for the quote request
     */
    params: GetQuoteParams<Action>;

    /**
     * Sorting strategy for the returned quotes
     * Can be either a predefined criteria or a custom sorting function
     * @default SortingCriteria.BEST_OUTPUT
     */
    sorting?: SortingStrategy;

    /**
     * Timeout in milliseconds for each provider
     * @default 10000 (10 seconds)
     */
    timeout?: number;
}

/**
 * Result status for a quote request
 */
export enum QuoteResultStatus {
    SUCCESS = "success",
    ERROR = "error",
    TIMEOUT = "timeout",
}

/**
 * A quote result with status and optional error
 */
export type QuoteResult<Action extends ValidActions, OpenParams extends BasicOpenParams> = {
    /**
     * The provider name
     */
    provider: string;

    /**
     * The status of the quote request
     */
    status: QuoteResultStatus;

    /**
     * The quote response (only present if status is "success")
     */
    quote?: GetQuoteResponse<Action, OpenParams>;

    /**
     * The error message (only present if status is "error" or "timeout")
     */
    error?: string;
};

/**
 * Response from getQuotes - array of quote results sorted by the specified strategy
 * Successful quotes are sorted first, followed by failed quotes
 */
export type GetQuotesResponse<
    Action extends ValidActions,
    OpenParams extends BasicOpenParams,
> = QuoteResult<Action, OpenParams>[];
