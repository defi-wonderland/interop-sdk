import { Quote } from "@across-protocol/app-sdk";
import { Hex, PublicClient, TransactionRequest } from "viem";

import {
    AcrossOpenParams,
    AcrossSwapMessageBuilder,
    AcrossSwapOpenParams,
    AcrossTransferOpenParams,
    Fee,
    GetQuoteParams,
    SwapGetQuoteParams,
    SwapGetQuoteParamsSchema,
    SwapGetQuoteResponse,
    TransferGetQuoteParams,
    TransferGetQuoteParamsSchema,
    TransferGetQuoteResponse,
    ValidActions,
} from "../../internal.js";

/**
 * Context interface for strategy operations
 */
export interface AcrossStrategyContext {
    publicClient: PublicClient;
    swapProtocol?: AcrossSwapMessageBuilder;
}
export interface AcrossSimulateStrategyContext extends AcrossStrategyContext {
    allowanceTx: TransactionRequest[];
}

export interface AcrossQuoteStrategyContext extends AcrossStrategyContext {
    acrossQuote: Quote;
    acrossOpenParams: AcrossOpenParams<ValidActions>;
    protocolName: string;
    fee: Fee;
}

/**
 * Base strategy interface with proper generic constraints
 */
export interface AcrossStrategy<TAction extends ValidActions> {
    readonly action: TAction;
    readonly schema: AcrossSchemaMap[TAction];
    quote(
        context: AcrossQuoteStrategyContext,
        params: AcrossQuoteParams<ValidActions>,
    ): Promise<AcrossQuoteResponse<TAction>>;
    simulate(
        context: AcrossSimulateStrategyContext,
        params: AcrossOpenParams<ValidActions>,
    ): Promise<TransactionRequest[]>;
    buildMessage(context: AcrossStrategyContext, params: AcrossQuoteParams<TAction>): Hex;
    parseGetQuoteParams(params: GetQuoteParams<ValidActions>): AcrossQuoteParams<TAction>;
}

/**
 * Type mapping for actions to their concrete strategy types
 */
export type AcrossStrategyMap = {
    crossChainTransfer: AcrossStrategy<"crossChainTransfer">;
    crossChainSwap: AcrossStrategy<"crossChainSwap">;
};

export type AcrossSchemaMap = {
    crossChainTransfer: typeof TransferGetQuoteParamsSchema;
    crossChainSwap: typeof SwapGetQuoteParamsSchema;
};

/**
 * Utility type to extract quote params from action
 */
export type AcrossQuoteParams<TAction extends ValidActions> = TAction extends "crossChainTransfer"
    ? TransferGetQuoteParams
    : TAction extends "crossChainSwap"
      ? SwapGetQuoteParams
      : never;

/**
 * Utility type to extract quote response from action
 */
export type AcrossQuoteResponse<TAction extends ValidActions> = TAction extends "crossChainTransfer"
    ? TransferGetQuoteResponse<AcrossOpenParams<TAction>>
    : TAction extends "crossChainSwap"
      ? SwapGetQuoteResponse<AcrossOpenParams<TAction>> & {
            openParams: AcrossOpenParams<TAction>;
        }
      : never;

/**
 * Utility type to extract open params from action
 */
export type AcrossOpenParamsForAction<TAction extends ValidActions> =
    TAction extends "crossChainTransfer"
        ? AcrossTransferOpenParams
        : TAction extends "crossChainSwap"
          ? AcrossSwapOpenParams
          : never;

/**
 * Utility type to get the strategy for a specific action
 */
export type StrategyForAction<TAction extends ValidActions> = AcrossStrategyMap[TAction];
