/**
 * Sorting strategies for quote comparison
 */
export enum SortingStrategy {
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
