import { TransactionRequest } from "viem";

import {
    CrossChainProvider,
    GetQuoteParams,
    GetQuoteResponse,
    SampleOpenParams,
    SampleOpenParamsSchema,
    SampleTransferOpenParams,
    SwapGetQuoteParamsSchema,
    SwapGetQuoteResponse,
    TransferGetQuoteParamsSchema,
    TransferGetQuoteResponse,
    UnsupportedAction,
} from "../internal.js";

/**
 * A sample implementation of the CrossChainProvider interface.
 * This provider is used to demonstrate the functionality of the CrossChainProvider interface.
 */
export class SampleProvider extends CrossChainProvider<SampleOpenParams> {
    readonly protocolName = "sample";

    constructor() {
        super();
    }

    /**
     * Get a quote for a cross-chain transfer
     * @param input - The input parameters for the transfer
     * @returns A promise that resolves to the transfer quote
     */
    private async getTransferQuote(
        input: GetQuoteParams<"crossChainTransfer">,
    ): Promise<TransferGetQuoteResponse<SampleOpenParams>> {
        const transferParams = TransferGetQuoteParamsSchema.parse(input);

        return {
            isAmountTooLow: false,
            protocol: "sample",
            action: "crossChainTransfer",
            output: {
                sender: transferParams.sender,
                recipient: transferParams.recipient,
                inputTokenAddress: transferParams.inputTokenAddress,
                outputTokenAddress: transferParams.outputTokenAddress,
                inputAmount: transferParams.inputAmount,
                outputAmount: transferParams.inputAmount,
                inputChainId: transferParams.inputChainId,
                outputChainId: transferParams.outputChainId,
            },
            openParams: {
                action: "crossChainTransfer",
                params: {
                    sender: transferParams.sender,
                    recipient: transferParams.recipient,
                    inputTokenAddress: transferParams.inputTokenAddress,
                    outputTokenAddress: transferParams.outputTokenAddress,
                    inputAmount: transferParams.inputAmount,
                    inputChainId: transferParams.inputChainId,
                    outputChainId: transferParams.outputChainId,
                },
            },
            fee: {
                total: "0",
                percent: "0",
            },
        } as TransferGetQuoteResponse<SampleOpenParams>;
    }

    /**
     * Get a quote for a cross-chain swap
     * @param input - The input parameters for the swap
     * @returns A promise that resolves to the swap quote
     */
    private async getSwapQuote(
        input: GetQuoteParams<"crossChainSwap">,
    ): Promise<SwapGetQuoteResponse<SampleOpenParams>> {
        const swapParams = SwapGetQuoteParamsSchema.parse(input);

        return {
            isAmountTooLow: false,
            protocol: "sample",
            action: "crossChainSwap",
            output: {
                sender: swapParams.sender,
                recipient: swapParams.recipient,
                inputTokenAddress: swapParams.inputTokenAddress,
                outputTokenAddress: swapParams.outputTokenAddress,
                inputAmount: swapParams.inputAmount,
                outputAmount: swapParams.outputAmount,
                inputChainId: swapParams.inputChainId,
                outputChainId: swapParams.outputChainId,
                slippage: swapParams.slippage,
            },
            openParams: {
                action: "crossChainSwap",
                params: {
                    sender: swapParams.sender,
                    recipient: swapParams.recipient,
                    inputTokenAddress: swapParams.inputTokenAddress,
                    outputTokenAddress: swapParams.outputTokenAddress,
                    inputAmount: swapParams.inputAmount,
                    inputChainId: swapParams.inputChainId,
                    outputChainId: swapParams.outputChainId,
                    slippage: swapParams.slippage,
                },
            },
            fee: {
                total: "0",
                percent: "0",
            },
        } as SwapGetQuoteResponse<SampleOpenParams>;
    }

    /**
     * @inheritdoc
     */
    async getQuote<Action extends SampleOpenParams["action"]>(
        action: Action,
        input: GetQuoteParams<Action>,
    ): Promise<GetQuoteResponse<Action, SampleOpenParams>> {
        switch (action) {
            case "crossChainTransfer":
                const transferParams = TransferGetQuoteParamsSchema.parse(input);
                return this.getTransferQuote(transferParams) as Promise<
                    GetQuoteResponse<Action, SampleTransferOpenParams>
                >;
            case "crossChainSwap":
                const swapParams = SwapGetQuoteParamsSchema.parse(input);
                return this.getSwapQuote(swapParams) as Promise<
                    GetQuoteResponse<Action, SampleOpenParams>
                >;
            default:
                throw new UnsupportedAction(action);
        }
    }

    /**
     * @inheritdoc
     */
    validateOpenParams(params: SampleOpenParams): void {
        SampleOpenParamsSchema.parse(params);
    }

    /**
     * @inheritdoc
     */
    validatedSimulateOpen(params: SampleOpenParams): Promise<TransactionRequest[]> {
        switch (params.action) {
            case "crossChainTransfer":
                return Promise.resolve([]);
            case "crossChainSwap":
                return Promise.resolve([]);
        }
    }
}
