import type {
    BasicGetQuoteParams,
    BasicGetQuoteResponse,
    BasicOpenParams,
} from "../crossChainProvider.interface.js";

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
