import type {
    BasicGetQuoteParams,
    BasicGetQuoteResponse,
    BasicOpenParams,
} from "../crossChainProvider.interface.js";

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
