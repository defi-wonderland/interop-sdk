import { Hex } from "viem";

import type {
    BasicGetQuoteParams,
    BasicGetQuoteResponse,
    BasicOpenParams,
} from "../crossChainProvider.interface.js";
import { SUPPORTED_TOKEN_BY_CHAIN_ID } from "../../internal.js";

/**
 * The parameters for the swap cross-bridge action.
 * @param Action - The action type.
 * @param Input - The input type.
 * @param Input.inputAmount - The input amount, string decimal representation of the amount.
 * @param Input.inputTokenAddress - The input token address, must be a valid token address for the input chain.
 * @param Input.outputTokenAddress - The output token address, must be a valid token address for the output chain.
 * @param Input.inputChainId - The input chain id, must be a supported chain id.
 * @param Input.outputChainId - The output chain id, must be a supported chain id.
 * @param Input.slippage - The slippage, string decimal representation of the slippage.
 */
export type SwapGetQuoteParams = BasicGetQuoteParams<{
    sender: Hex;
    recipient: Hex;
    inputAmount: string;
    inputTokenAddress: Hex;
    outputTokenAddress: Hex;
    inputChainId: keyof typeof SUPPORTED_TOKEN_BY_CHAIN_ID;
    outputChainId: keyof typeof SUPPORTED_TOKEN_BY_CHAIN_ID;
    slippage: string;
}>;

/**
 * The response for the swap cross-bridge action.
 * @param Action - The action type.
 * @param Output - The output type.
 * @param Output.inputTokenAddress - The input token address, must be a valid token address for the input chain.
 * @param Output.outputTokenAddress - The output token address, must be a valid token address for the output chain.
 * @param Output.inputAmount - The input amount, string decimal representation of the amount.
 * @param Output.outputAmount - The output amount, string decimal representation of the amount.
 * @param Output.inputChainId - The input chain id, must be a supported chain id.
 * @param Output.outputChainId - The output chain id, must be a supported chain id.
 * @param Output.slippage - The slippage, string decimal representation of the slippage.
 * @param OpenParams - The open parameters for the action.
 */
export type SwapGetQuoteResponse<OpenParams extends BasicOpenParams> = BasicGetQuoteResponse<
    "crossChainSwap",
    {
        sender: Hex;
        recipient: Hex;
        inputTokenAddress: Hex;
        outputTokenAddress: Hex;
        inputAmount: string;
        outputAmount: string;
        inputChainId: keyof typeof SUPPORTED_TOKEN_BY_CHAIN_ID;
        outputChainId: keyof typeof SUPPORTED_TOKEN_BY_CHAIN_ID;
        slippage: string;
    },
    OpenParams
>;
