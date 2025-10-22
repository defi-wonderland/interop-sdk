import type { BasicOpenParams, QuoteResult, ValidActions } from "../internal.js";

/**
 * Predefined sorting criteria for quote comparison
 */
export enum SortingCriteria {
    /**
     * Sort by highest output amount (what user receives)
     */
    BEST_OUTPUT = "bestOutput",

    /**
     * Sort by lowest fee amount (absolute fee)
     */
    LOWEST_FEE_AMOUNT = "lowestFeeAmount",

    /**
     * Sort by lowest fee percentage (best rate)
     */
    LOWEST_FEE_PERCENT = "lowestFeePercent",
}

/**
 * Custom sorting function type
 * @param a - First quote result to compare
 * @param b - Second quote result to compare
 * @returns Negative if a < b, positive if a > b, zero if equal
 */
export type CustomSortingStrategy = (
    a: QuoteResult<ValidActions, BasicOpenParams>,
    b: QuoteResult<ValidActions, BasicOpenParams>,
) => number;

/**
 * Sorting strategy - can be either a predefined criteria or a custom function
 */
export type SortingStrategy = SortingCriteria | CustomSortingStrategy;
