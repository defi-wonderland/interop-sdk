import type { GetQuoteRequest, PostOrderResponse } from "@openintentsframework/oif-specs";
import type { Hex } from "viem";

import type { AssetDiscoveryConfig } from "./assetDiscovery.interface.js";
import type { FillWatcherConfig } from "./fillWatcher.interface.js";
import type { OpenedIntentParserConfig } from "./openedIntentParser.interface.js";
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
     *       // Optional: custom headers and cache TTL
     *       // headers: { "Authorization": "Bearer ..." },
     *       // cacheTtl: 300000, // 5 minutes
     *     },
     *   };
     * }
     * ```
     */
    getDiscoveryConfig(): AssetDiscoveryConfig | null {
        return null;
    }
}
