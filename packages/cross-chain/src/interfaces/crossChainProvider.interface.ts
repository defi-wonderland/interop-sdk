import type { GetQuoteRequest, PostOrderResponse } from "@openintentsframework/oif-specs";
import type { EIP1193Provider } from "viem";

import type { DepositInfoParserConfig } from "../services/EventBasedDepositInfoParser.js";
import type { FillWatcherConfig } from "../services/EventBasedFillWatcher.js";
import type { OpenEventParserConfig } from "./openEventParser.interface.js";
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
     * Execute a quote submitting it to the provider
     * @param quote - The quote to execute
     * @param signer - The signer to use to sign the order
     * @returns The response from the provider
     */
    abstract execute(quote: ExecutableQuote, signer: EIP1193Provider): Promise<PostOrderResponse>;

    /**
     * Get the configuration for intent tracking
     * This method provides the protocol-specific configuration needed to create
     * an IntentTracker for monitoring cross-chain transaction status.
     *
     * @returns Configuration object containing:
     *   - openEventParser: Optional config for protocols that don't emit EIP-7683 Open events
     *   - depositInfoParser: Config for parsing deposit info from protocol events
     *   - fillWatcher: Config for watching fill events on destination chain
     */
    abstract getTrackingConfig(): {
        /** Optional: For protocols that don't emit standard EIP-7683 Open events */
        openEventParser?: OpenEventParserConfig;
        depositInfoParser: DepositInfoParserConfig;
        fillWatcher: FillWatcherConfig;
    };
}
