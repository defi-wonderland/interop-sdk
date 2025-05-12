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
type ValidActions = "transferCrossBridge" | "swapCrossBridge";

/**
 * The basic parameters for the get quote action.
 */
type BasicGetQuoteParams<Params> = Params;

/**
 * The parameters for the transfer cross-bridge action.
 */
export type TransferGetQuoteParams = BasicGetQuoteParams<{
    inputTokenAddress: string;
    outputTokenAddress: string;
    inputAmount: string;
    inputChainId: string;
    outputChainId: string;
}>;

/**
 * The parameters for the swap cross-bridge action.
 */
export type SwapGetQuoteParams = BasicGetQuoteParams<{
    inputAmount: string;
    outputAmount: string;
    inputTokenAddress: string;
    outputTokenAddress: string;
    inputChainId: string;
    outputChainId: string;
    slippage: string;
}>;

/**
 * The parameters for the get quote action.
 */
export type GetQuoteParams<Action extends ValidActions> = {
    transferCrossBridge: TransferGetQuoteParams;
    swapCrossBridge: SwapGetQuoteParams;
}[Action];

/**
 * The basic parameters for the open action.
 */
export type BasicOpenParams = {
    action: ValidActions;
    params: Record<string, unknown>;
};

/**
 * The basic response for the get quote action.
 */
type BasicGetQuoteResponse<
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
        fee: {
            total: string;
            percent: string;
        };
    },
    Action
>;

/**
 * The response for the transfer cross-bridge action.
 */
export type TransferGetQuoteResponse<OpenParams extends BasicOpenParams> = BasicGetQuoteResponse<
    "transferCrossBridge",
    {
        inputTokenAddress: string;
        outputTokenAddress: string;
        inputAmount: string;
        outputAmount: string;
        inputChainId: string;
        outputChainId: string;
    },
    OpenParams
>;

/**
 * The response for the swap cross-bridge action.
 */
export type SwapGetQuoteResponse<OpenParams extends BasicOpenParams> = BasicGetQuoteResponse<
    "swapCrossBridge",
    {
        inputTokenAddress: string;
        outputTokenAddress: string;
        inputAmount: string;
        outputAmount: string;
        inputChainId: string;
        outputChainId: string;
    },
    OpenParams
>;

/**
 * The response for the get quote action.
 */
export type GetQuoteResponse<Action extends ValidActions, OpenParams extends BasicOpenParams> = {
    transferCrossBridge: TransferGetQuoteResponse<OpenParams>;
    swapCrossBridge: SwapGetQuoteResponse<OpenParams>;
}[Action];

export interface CrossChainProvider<ProtocolOpenParams extends BasicOpenParams> {
    /**
     * Get a quote for a cross-chain action
     * @param action - The action to get a quote for
     * @param params - The parameters for the action
     * @returns A quote for the action
     */
    getQuote<Action extends BasicOpenParams["action"]>(
        action: Action,
        params: GetQuoteParams<Action>,
    ): Promise<GetQuoteResponse<Action, ProtocolOpenParams>>;

    /**
     * Open a cross-chain action
     * @param params - The parameters for the action, returned from the `getQuote` method
     * @returns A transaction hash for the action
     */
    open: (params: ProtocolOpenParams) => Promise<string>;
}
