import { encodeFunctionData, Hex, TransactionRequest } from "viem";

import {
    ACROSS_OIF_ADAPTER_CONTRACT_ADDRESSES,
    ACROSS_OPEN_GAS_LIMIT,
    AcrossOpenParams,
    AcrossQuoteParams,
    AcrossQuoteStrategyContext,
    AcrossSimulateStrategyContext,
    AcrossStrategy,
    AcrossStrategyContext,
    AcrossStrategyMap,
    formatTokenAmount,
    GetQuoteParams,
    OPEN_ABI,
    SUPPORTED_CHAINS,
    SwapGetQuoteParams,
    SwapGetQuoteResponse,
    TransferGetQuoteParams,
    TransferGetQuoteResponse,
    UnsupportedChainId,
    ValidActions,
} from "../../internal.js";
import { SwapGetQuoteParamsSchema } from "../../schemas/actions/swapAction.schema.js";
import { TransferGetQuoteParamsSchema } from "../../schemas/actions/transferAction.schema.js";

/**
 * Transfer strategy implementation
 */
export class AcrossTransferStrategy implements AcrossStrategy<"crossChainTransfer"> {
    readonly action = "crossChainTransfer" as const;
    readonly schema = TransferGetQuoteParamsSchema;

    /**
     * Quote the transfer transaction for an Across cross-chain transfer
     * @param context - The context for the strategy
     * @param params - The parameters for the action
     * @returns The quote
     */
    async quote(
        context: AcrossQuoteStrategyContext,
        params: AcrossQuoteParams<"crossChainTransfer">,
    ): Promise<TransferGetQuoteResponse<AcrossOpenParams<"crossChainTransfer">>> {
        const inputChain = SUPPORTED_CHAINS.find(
            (chain) => chain.id === Number(params.inputChainId),
        );

        if (!inputChain) {
            throw new UnsupportedChainId(params.inputChainId);
        }

        const outputChain = SUPPORTED_CHAINS.find(
            (chain) => chain.id === Number(params.outputChainId),
        );

        if (!outputChain) {
            throw new UnsupportedChainId(params.outputChainId);
        }

        const quote = context.acrossQuote;
        const openParams = context.acrossOpenParams;
        const fee = context.fee;
        return {
            protocol: context.protocolName,
            action: "crossChainTransfer",
            isAmountTooLow: quote.isAmountTooLow,
            output: {
                inputTokenAddress: quote.deposit.inputToken,
                outputTokenAddress: quote.deposit.outputToken,
                inputAmount: await formatTokenAmount(
                    {
                        amount: quote.deposit.inputAmount,
                        tokenAddress: quote.deposit.inputToken,
                        chain: inputChain,
                    },
                    { publicClient: context.publicClient },
                ),
                outputAmount: await formatTokenAmount(
                    {
                        amount: quote.deposit.outputAmount,
                        tokenAddress: quote.deposit.outputToken,
                        chain: outputChain,
                    },
                    { publicClient: context.publicClient },
                ),
                inputChainId: quote.deposit.originChainId,
                outputChainId: quote.deposit.destinationChainId,
            },
            openParams,
            fee,
        } as TransferGetQuoteResponse<AcrossOpenParams<"crossChainTransfer">>;
    }

    /**
     * Simulate the open transaction for an Across cross-chain transfer
     * @param params - The parameters for the action
     * @param context - The context for the strategy
     * @returns The open transaction
     */
    async simulate(
        context: AcrossSimulateStrategyContext,
        params: AcrossOpenParams<ValidActions>,
    ): Promise<TransactionRequest[]> {
        const { fillDeadline, orderDataType, orderData, inputChainId, sender } = params.params;
        const result: TransactionRequest[] = [];

        const inputChain = SUPPORTED_CHAINS.find((chain) => chain.id === Number(inputChainId));

        if (!inputChain) {
            throw new UnsupportedChainId(inputChainId);
        }

        const settlerContractAddress = ACROSS_OIF_ADAPTER_CONTRACT_ADDRESSES[Number(inputChainId)];

        const allowanceTx = context.allowanceTx;

        result.push(...allowanceTx);

        const openData = encodeFunctionData({
            abi: OPEN_ABI,
            functionName: "open",
            args: [{ fillDeadline, orderDataType, orderData }],
        });

        const openTx = await context.publicClient.prepareTransactionRequest({
            account: sender,
            to: settlerContractAddress,
            data: openData,
            chain: inputChain,
            gas: ACROSS_OPEN_GAS_LIMIT,
        });

        return [...result, openTx];
    }

    buildMessage(_context: AcrossStrategyContext, _params: TransferGetQuoteParams): Hex {
        return "0x";
    }

    parseGetQuoteParams(
        params: GetQuoteParams<ValidActions>,
    ): AcrossQuoteParams<"crossChainTransfer"> {
        return this.schema.parse(params);
    }
}

/**
 * Swap strategy implementation
 */
export class AcrossSwapStrategy implements AcrossStrategy<"crossChainSwap"> {
    readonly action = "crossChainSwap" as const;
    readonly schema = SwapGetQuoteParamsSchema;

    async quote(
        _context: AcrossQuoteStrategyContext,
        _params: AcrossQuoteParams<"crossChainSwap">,
    ): Promise<SwapGetQuoteResponse<AcrossOpenParams<"crossChainSwap">>> {
        return {} as SwapGetQuoteResponse<AcrossOpenParams<"crossChainSwap">>;
    }

    async simulate(
        _context: AcrossSimulateStrategyContext,
        _params: AcrossOpenParams<"crossChainSwap">,
    ): Promise<TransactionRequest[]> {
        // const { fillDeadline, orderDataType, orderData, inputChainId, sender } = params.params;
        const result: TransactionRequest[] = [];
        return result;
    }

    buildMessage(context: AcrossStrategyContext, params: SwapGetQuoteParams): Hex {
        if (!context.swapProtocol) {
            throw new Error("Swap protocol not configured");
        }
        return context.swapProtocol.buildAcrossMessage(params);
    }

    parseGetQuoteParams(params: GetQuoteParams<ValidActions>): AcrossQuoteParams<"crossChainSwap"> {
        return this.schema.parse(params);
    }
}

/**
 * Strategy registry with type-safe mapping
 */
export const acrossStrategies = {
    crossChainTransfer: new AcrossTransferStrategy(),
    crossChainSwap: new AcrossSwapStrategy(),
} as const;

/**
 * Type-safe strategy getter with proper type inference
 */
export function getAcrossStrategy<TAction extends ValidActions>(
    action: TAction,
): AcrossStrategyMap[TAction] {
    return acrossStrategies[action] as AcrossStrategyMap[TAction];
}

/**
 * Example usage in AcrossProvider:
 *
 * ```typescript
 * async getQuote<Action extends AcrossOpenParams["action"]>(
 *     action: Action,
 *     input: GetQuoteParams<Action>,
 * ): Promise<GetQuoteResponse<Action, AcrossOpenParams>> {
 *     const strategy = getAcrossStrategy(action); // Type is inferred based on action
 *     const params = strategy.schema.parse(input); // Properly typed params
 *     return strategy.quote(this, params); // Properly typed response
 * }
 *
 * async validatedSimulateOpen(params: AcrossOpenParams): Promise<TransactionRequest[]> {
 *     const strategy = getAcrossStrategy(params.action); // Type is inferred
 *     return strategy.simulate(this, params); // Properly typed
 * }
 * ```
 */
