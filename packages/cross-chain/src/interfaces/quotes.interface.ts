import type { Quote } from "@wonderland/interop-oif-specs";
import type { PrepareTransactionRequestReturnType } from "viem";

/**
 * An executable quote is a quote that has been prepared for execution
 * @description An executable quote is a quote that has been prepared for execution
 * @example
 * {
 *   ...quote,
 *   preparedTransaction: PrepareTransactionRequestReturnType,
 * }
 */
export interface ExecutableQuote extends Quote {
    preparedTransaction?: PrepareTransactionRequestReturnType;
}
