import type { Order, Quote } from "@openintentsframework/oif-specs";
import type { Address, PrepareTransactionRequestReturnType } from "viem";

export interface AcrossOrder {
    type: "across";
    payload: {
        simulationSuccess: boolean;
        chainId: number;
        to: Address;
        data: string;
        gas: string;
        maxFeePerGas: string;
        maxPriorityFeePerGas: string;
    };
    metadata: object;
}

export interface QuoteWithAcross extends Omit<Quote, "order"> {
    order: Order | AcrossOrder;
}

/**
 * An executable quote is a quote that has been prepared for execution
 * @description An executable quote is a quote that has been prepared for execution
 * @example
 * {
 *   ...quote,
 *   preparedTransaction: PrepareTransactionRequestReturnType,
 * }
 */
export interface ExecutableQuote extends QuoteWithAcross {
    preparedTransaction?: PrepareTransactionRequestReturnType;
}
