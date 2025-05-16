import type { TransactionRequest } from "viem";

import type {
    SwapGetQuoteParams,
    SwapGetQuoteResponse,
    TransferGetQuoteParams,
    TransferGetQuoteResponse,
} from "./actions/index.js";

/**
 * A unique symbol used to brand the action type.
 * This is used to prevent type errors when using the action type in a function.
 */
declare const __action: unique symbol;

/**
 * A branded type that combines a type with a brand.
 * This is used to prevent type errors when using the action type in a function.
 */
type Brand<B> = { [__action]: B };
export type Branded<T, B> = T & Brand<B>;

/**
 * The valid actions for the CrossChainProvider interface.
 */
type ValidActions = "crossChainTransfer" | "crossChainSwap";

/**
 * The basic parameters for the get quote action.
 */
export type BasicGetQuoteParams<Params> = Params;

/**
 * The parameters for the get quote action.
 */
export type GetQuoteParams<Action extends ValidActions> = {
    crossChainTransfer: TransferGetQuoteParams;
    crossChainSwap: SwapGetQuoteParams;
}[Action];

/**
 * The basic parameters for the open action.
 */
export type BasicOpenParams = {
    action: ValidActions;
    params: Record<string, unknown>;
};

/**
 * The fee for the cross-chain action.
 */
export type Fee = {
    total: string;
    percent: string;
};

/**
 * The basic response for the get quote action.
 */
export type BasicGetQuoteResponse<
    Action extends ValidActions,
    Output,
    OpenParams extends BasicOpenParams,
> = Branded<
    {
        isAmountTooLow: boolean;
        protocol: string;
        action: Action;
        output: Output;
        openParams: OpenParams;
        fee: Fee;
    },
    Action
>;

/**
 * The response for the get quote action.
 */
export type GetQuoteResponse<Action extends ValidActions, OpenParams extends BasicOpenParams> = {
    crossChainTransfer: TransferGetQuoteResponse<OpenParams>;
    crossChainSwap: SwapGetQuoteResponse<OpenParams>;
}[Action];

export interface CrossChainProvider<ProtocolOpenParams extends BasicOpenParams> {
    /**
     * Get a quote for a cross-chain action
     * @param action - The action to get a quote for
     * @param params - The parameters for the action
     * @returns A quote for the action
     */
    getQuote<Action extends ProtocolOpenParams["action"]>(
        action: Action,
        params: GetQuoteParams<Action>,
    ): Promise<GetQuoteResponse<Action, ProtocolOpenParams>>;

    /**
     * Return a transaction object for a cross-chain action
     * @param params - The parameters for the action, returned from the `getQuote` method
     * @returns A transaction object for the action
     */
    simulateOpen: (params: ProtocolOpenParams) => Promise<TransactionRequest[]>;
}
