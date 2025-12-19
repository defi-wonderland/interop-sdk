import type { GetQuoteRequest, PostOrderResponse } from "@openintentsframework/oif-specs";
import type { Hex } from "viem";

import type { DepositInfoParserConfig } from "../services/EventBasedDepositInfoParser.js";
import type { FillWatcherConfig } from "../services/EventBasedFillWatcher.js";
import type { ExecutableQuote } from "./quotes.interface.js";

export abstract class CrossChainProvider {
    /**
     * The name of the provider
     */
    abstract protocolName: string;

    /**
     * The provider identifier in case we have more than one provider with the same protocol name
     */
    abstract providerId: string;

    /**
     * Get the protocol name for the provider
     * @returns The protocol name
     * @final Never override this method
     */
    getProtocolName(): string {
        return this.protocolName;
    }

    /**
     * Get the provider identifier for the provider
     * @returns The provider identifier
     * @final Never override this method
     */
    getProviderId(): string {
        return this.providerId;
    }

    /**
     * Get a quote for a cross-chain action
     * @param params - The parameters for get quote request
     * @returns A quote for the request
     */
    abstract getQuotes(params: GetQuoteRequest): Promise<ExecutableQuote[]>;

    /**
     * Submit a signed order to the provider
     * @param quote - The quote containing the order
     * @param signature - The EIP-712 signature (hex string or Uint8Array)
     * @returns The post order response
     * @throws ProviderExecuteNotImplemented if the provider doesn't support this method
     */
    abstract submitSignedOrder(
        quote: ExecutableQuote,
        signature: Hex | Uint8Array,
    ): Promise<PostOrderResponse>;

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
