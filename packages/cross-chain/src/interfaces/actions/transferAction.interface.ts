import { Hex } from "viem";

import type {
    BasicGetQuoteParams,
    BasicGetQuoteResponse,
    BasicOpenParams,
} from "../crossChainProvider.interface.js";
import { SUPPORTED_TOKEN_BY_CHAIN_ID } from "../../internal.js";

/**
 * The parameters for the transfer cross-bridge action.
 * @param Action - The action type.
 * @param Input - The input type.
 * @param Input.inputTokenAddress - The input token address, must be a valid token address for the input chain.
 * @param Input.outputTokenAddress - The output token address, must be a valid token address for the output chain.
 * @param Input.inputAmount - The input amount, string decimal representation of the amount.
 * @param Input.inputChainId - The input chain id, must be a supported chain id.
 * @param Input.outputChainId - The output chain id, must be a supported chain id.
 */
export type TransferGetQuoteParams = BasicGetQuoteParams<{
    sender: Hex;
    recipient: Hex;
    inputTokenAddress: Hex;
    outputTokenAddress: Hex;
    inputAmount: string;
    inputChainId: keyof typeof SUPPORTED_TOKEN_BY_CHAIN_ID;
    outputChainId: keyof typeof SUPPORTED_TOKEN_BY_CHAIN_ID;
}>;

/**
 * The response for the transfer cross-bridge action.
 * @param Action - The action type.
 * @param Output - The output type.
 * @param Output.inputTokenAddress - The input token address, must be a valid token address for the input chain.
 * @param Output.outputTokenAddress - The output token address, must be a valid token address for the output chain.
 * @param Output.inputAmount - The input amount, string decimal representation of the amount.
 * @param Output.outputAmount - The output amount, string decimal representation of the amount.
 * @param Output.inputChainId - The input chain id, must be a supported chain id.
 * @param Output.outputChainId - The output chain id, must be a supported chain id.
 * @param OpenParams - The open parameters for the action.
 */
export type TransferGetQuoteResponse<OpenParams extends BasicOpenParams> = BasicGetQuoteResponse<
    "crossChainTransfer",
    {
        sender: Hex;
        recipient: Hex;
        inputTokenAddress: Hex;
        outputTokenAddress: Hex;
        inputAmount: string;
        outputAmount: string;
        inputChainId: keyof typeof SUPPORTED_TOKEN_BY_CHAIN_ID;
        outputChainId: keyof typeof SUPPORTED_TOKEN_BY_CHAIN_ID;
    },
    OpenParams
>;
