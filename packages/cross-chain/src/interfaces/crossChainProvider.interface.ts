import type { TransactionRequest } from "viem";

import type { DepositInfoParserConfig } from "../services/EventBasedDepositInfoParser.js";
import type { FillWatcherConfig } from "../services/EventBasedFillWatcher.js";
import type {
    SwapGetQuoteParams,
    SwapGetQuoteResponse,
    TransferGetQuoteParams,
    TransferGetQuoteResponse,
} from "./actions/index.js";

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
export type ValidActions = "crossChainTransfer" | "crossChainSwap";

/**
 * The basic parameters for the get quote action.
 */
export type BasicGetQuoteParams<Params> = Params;

/**
 * The parameters for the get quote action.
 */
export type GetQuoteParams<Action extends ValidActions> = {
    crossChainTransfer: TransferGetQuoteParams;
    crossChainSwap: SwapGetQuoteParams;
}[Action];

/**
 * The basic parameters for the open action.
 */
export type BasicOpenParams = {
    action: ValidActions;
    params: Record<string, unknown>;
};

/**
 * The fee for the cross-chain action.
 */
export type Fee = {
    total: string;
    percent: string;
};

/**
 * The basic response for the get quote action.
 */
export type BasicGetQuoteResponse<
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
        fee: Fee;
    },
    Action
>;

/**
 * The response for the get quote action.
 */
export type GetQuoteResponse<Action extends ValidActions, OpenParams extends BasicOpenParams> = {
    crossChainTransfer: TransferGetQuoteResponse<OpenParams>;
    crossChainSwap: SwapGetQuoteResponse<OpenParams>;
}[Action];

export abstract class CrossChainProvider<ProtocolOpenParams extends BasicOpenParams> {
    /**
     * The name of the provider
     */
    abstract protocolName: string;

    /**
     * Get the protocol name for the provider
     * @returns The protocol name
     * @final Never override this method
     */
    getProtocolName(): string {
        return this.protocolName;
    }

    /**
     * Get a quote for a cross-chain action
     * @param action - The action to get a quote for
     * @param params - The parameters for the action
     * @returns A quote for the action
     */
    abstract getQuote<Action extends ProtocolOpenParams["action"]>(
        action: Action,
        params: GetQuoteParams<Action>,
    ): Promise<GetQuoteResponse<Action, ProtocolOpenParams>>;

    /**
     * Simulate an open for a cross-chain action with validated parameters
     * @param params - The parameters for the action
     * @returns A transaction object for the action
     */
    abstract validatedSimulateOpen(params: ProtocolOpenParams): Promise<TransactionRequest[]>;

    /**
     * Validate the parameters for an open for a cross-chain action
     * @param params - The parameters for the action
     */
    abstract validateOpenParams(params: ProtocolOpenParams): void;

    /**
     * Return a transaction object for a cross-chain action
     * This method is a wrapper around the `validatedSimulateOpen` method
     * and validates the parameters before simulating the action.
     * @param params - The parameters for the action, returned from the `getQuote` method
     * @returns A transaction object for the action
     * @final Never override this method
     */
    async simulateOpen(params: ProtocolOpenParams): Promise<TransactionRequest[]> {
        this.validateOpenParams(params);
        return this.validatedSimulateOpen(params);
    }

    /**
     * Get the configuration for intent tracking
     * This method provides the protocol-specific configuration needed to create
     * an IntentTracker for monitoring cross-chain transaction status.
     *
     * @returns Configuration object containing deposit info parser and fill watcher configs
     */
    abstract getTrackingConfig(): {
        depositInfoParser: DepositInfoParserConfig;
        fillWatcher: FillWatcherConfig;
    };
}
