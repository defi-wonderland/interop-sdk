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
     * @default SortingStrategy.BEST_OUTPUT
     */
    sorting?: SortingStrategy;
}

/**
 * Response from getQuotes - array of quotes sorted by the specified strategy
 * The first element is always the best quote based on the sorting criteria
 */
export type GetQuotesResponse<
    Action extends ValidActions,
    OpenParams extends BasicOpenParams,
> = GetQuoteResponse<Action, OpenParams>[];
