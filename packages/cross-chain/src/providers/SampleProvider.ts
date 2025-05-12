import {
    CrossChainProvider,
    GetQuoteParams,
    GetQuoteResponse,
    SwapGetQuoteParamsSchema,
    TransferGetQuoteParamsSchema,
} from "../internal.js";

type SampleTransferOpenParams = {
    action: "transferCrossBridge";
    params: {
        inputTokenAddress: string;
        outputTokenAddress: string;
        inputAmount: string;
        inputChainId: string;
        outputChainId: string;
    };
};

type SampleSwapOpenParams = {
    action: "swapCrossBridge";
    params: {
        inputAmount: string;
        outputAmount: string;
        inputTokenAddress: string;
        outputTokenAddress: string;
        inputChainId: string;
        outputChainId: string;
    };
};

type SampleOpenParams = SampleTransferOpenParams | SampleSwapOpenParams;

/**
 * A sample implementation of the CrossChainProvider interface.
 * This provider is used to demonstrate the functionality of the CrossChainProvider interface.
 */
export class SampleProvider implements CrossChainProvider<SampleOpenParams> {
    constructor() {}

    /**
     * @inheritdoc
     */
    async getQuote<Action extends SampleOpenParams["action"]>(
        action: Action,
        input: GetQuoteParams<Action>,
    ): Promise<GetQuoteResponse<Action, SampleOpenParams>> {
        switch (action) {
            case "transferCrossBridge":
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

            case "swapCrossBridge":
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
    open(params: SampleOpenParams): Promise<string> {
        return Promise.resolve(params.action);
    }
}
