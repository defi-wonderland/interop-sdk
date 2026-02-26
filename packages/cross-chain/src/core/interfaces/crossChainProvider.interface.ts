import type { Hex } from "viem";

import type { Quote, SubmitOrderResponse } from "../types/quote.js";
import type { QuoteRequest } from "../types/quoteRequest.js";
import type { AssetDiscoveryConfig } from "./assetDiscovery.interface.js";
import type { FillWatcherConfig } from "./fillWatcher.interface.js";
import type { OpenedIntentParserConfig } from "./openedIntentParser.interface.js";
import { ProviderExecuteNotImplemented } from "../errors/ProviderExecuteNotImplemented.exception.js";

export abstract class CrossChainProvider {
    /**
     * The name of the provider
     */
    abstract protocolName: string;

    /**
     * Unique identifier for this provider instance.
     * Distinct from `quote.provider` which is the solver's self-identification
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
     * Get the provider identifier
     * @returns The provider identifier
     * @final Never override this method
     */
    getProviderId(): string {
        return this.providerId;
    }

    /**
     * Get quotes for a cross-chain action
     * @param params - The SDK quote request with readable addresses
     * @returns A list of quotes for the request
     */
    abstract getQuotes(params: QuoteRequest): Promise<Quote[]>;

    /**
     * Submit a signed order to the provider.
     *
     * Default implementation throws {@link ProviderExecuteNotImplemented}.
     * Override in providers that support signature-based order submission.
     *
     * @param _quote - The quote to submit
     * @param _signature - The EIP-712 signature (hex string)
     * @returns The submit order response
     * @throws ProviderExecuteNotImplemented if the provider doesn't support this method
     */
    async submitOrder(_quote: Quote, _signature: Hex): Promise<SubmitOrderResponse> {
        throw new ProviderExecuteNotImplemented(this.getProviderId());
    }

    /**
     * Get the configuration for intent tracking
     * This method provides the protocol-specific configuration needed to create
     * an OrderTracker for monitoring cross-chain transaction status.
     *
     * @returns Configuration object containing:
     *   - openedIntentParserConfig: Config for parsing opened intent from origin chain
     *   - fillWatcherConfig: Config for watching fill events on destination chain
     */
    abstract getTrackingConfig(): {
        /** Configuration for parsing opened intent data */
        openedIntentParserConfig: OpenedIntentParserConfig;
        /** Configuration for watching fill events */
        fillWatcherConfig: FillWatcherConfig;
    };

    /**
     * Get the configuration for asset discovery
     *
     * This method allows providers to declare support for asset discovery.
     * Returns null if discovery is not supported (default behavior).
     *
     * Providers that support discovery should override this method to return
     * an appropriate configuration:
     * - { type: "oif", config: { baseUrl: "..." } } for OIF-compliant solvers
     *   (baseUrl is required and points to the solver's API endpoint)
     * - { type: "custom-api", config: {...} } for custom APIs
     * - { type: "static", config: {...} } for static asset lists
     *
     * @returns Asset discovery configuration, or null if not supported
     *
     * @example OIF Provider (baseUrl is required for the factory to create the service):
     * ```typescript
     * getDiscoveryConfig() {
     *   return {
     *     type: "oif",
     *     config: {
     *       baseUrl: "https://api.solver.example.com",
     *       // Optional: custom headers, timeout
     *       // headers: { "Authorization": "Bearer ..." },
     *     },
     *   };
     * }
     * ```
     */
    getDiscoveryConfig(): AssetDiscoveryConfig | null {
        return null;
    }
}
