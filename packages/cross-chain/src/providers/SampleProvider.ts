import { TransactionRequest } from "viem";

import {
    CrossChainProvider,
    GetQuoteParams,
    GetQuoteResponse,
    SampleOpenParams,
    SampleOpenParamsSchema,
    SwapGetQuoteParamsSchema,
    TransferGetQuoteParamsSchema,
} from "../internal.js";

/**
 * A sample implementation of the CrossChainProvider interface.
 * This provider is used to demonstrate the functionality of the CrossChainProvider interface.
 */
export class SampleProvider extends CrossChainProvider<SampleOpenParams> {
    constructor() {
        super();
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

                return {
                    isAmountTooLow: false,
                    protocol: "sample",
                    action,
                    output: {
                        inputTokenAddress: transferParams.inputTokenAddress,
                        outputTokenAddress: transferParams.outputTokenAddress,
                        inputAmount: transferParams.inputAmount,
                        outputAmount: transferParams.inputAmount,
                        inputChainId: transferParams.inputChainId,
                        outputChainId: transferParams.outputChainId,
                    },
                    openParams: {
                        action,
                        params: {
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
                } as GetQuoteResponse<Action, SampleOpenParams>;

            case "crossChainSwap":
                const swapParams = SwapGetQuoteParamsSchema.parse(input);

                return {
                    isAmountTooLow: false,
                    protocol: "sample",
                    action,
                    output: {
                        inputTokenAddress: swapParams.inputTokenAddress,
                        outputTokenAddress: swapParams.outputTokenAddress,
                        inputAmount: swapParams.inputAmount,
                        outputAmount: swapParams.outputAmount,
                        inputChainId: swapParams.inputChainId,
                        outputChainId: swapParams.outputChainId,
                    },
                    openParams: {
                        action,
                        params: {
                            inputTokenAddress: swapParams.inputTokenAddress,
                            outputTokenAddress: swapParams.outputTokenAddress,
                            inputAmount: swapParams.inputAmount,
                            outputAmount: swapParams.outputAmount,
                            inputChainId: swapParams.inputChainId,
                            outputChainId: swapParams.outputChainId,
                        },
                    },
                    fee: {
                        total: "0",
                        percent: "0",
                    },
                } as GetQuoteResponse<Action, SampleOpenParams>;
            default:
                throw new Error("Invalid action");
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
