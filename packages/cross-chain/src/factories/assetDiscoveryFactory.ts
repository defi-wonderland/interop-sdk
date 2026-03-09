import {
    AssetDiscoveryConfig,
    AssetDiscoveryService,
    CrossChainProvider,
    CustomApiAssetDiscoveryConfig,
    CustomApiAssetDiscoveryService,
    OIFAssetDiscoveryConfig,
    OIFAssetDiscoveryService,
    OIFAssetDiscoveryServiceConfig,
    RelayAssetDiscoveryConfig,
    RelayAssetDiscoveryService,
    StaticAssetDiscoveryService,
} from "../internal.js";

/**
 * Factory for creating AssetDiscoveryService instances
 *
 * Creates the appropriate service based on the provider's discovery configuration
 * and immediately starts prefetching so data is ready when needed.
 *
 * @example
 * ```typescript
 * const factory = new AssetDiscoveryFactory();
 *
 * // Create service for a provider that supports discovery
 * const service = factory.createService(oifProvider);
 *
 * if (service) {
 *   // Data is already being fetched in the background
 *   const assets = await service.getSupportedAssets();
 * }
 * ```
 */
export class AssetDiscoveryFactory {
    /**
     * Create an AssetDiscoveryService for a provider
     *
     * The returned service starts prefetching immediately.
     *
     * @param provider - The provider to create a service for
     * @returns AssetDiscoveryService instance, or null if provider doesn't support discovery
     */
    createService(provider: CrossChainProvider): AssetDiscoveryService | null {
        const config = provider.getDiscoveryConfig?.();

        if (!config) {
            return null;
        }

        const service = this.createServiceFromConfig(config, provider.getProviderId());
        service.prefetch();
        return service;
    }

    /**
     * Create an AssetDiscoveryService from a configuration
     *
     * @param config - The discovery configuration
     * @param providerId - Provider ID for attribution
     * @returns AssetDiscoveryService instance
     */
    createServiceFromConfig(
        config: AssetDiscoveryConfig,
        providerId: string,
    ): AssetDiscoveryService {
        switch (config.type) {
            case "oif":
                return this.createOIFService(config, providerId);

            case "custom-api":
                return this.createCustomApiService(config, providerId);

            case "relay":
                return this.createRelayService(config, providerId);

            case "static":
                return new StaticAssetDiscoveryService(config.config.networks, providerId);

            default: {
                // Exhaustive check
                const _exhaustive: never = config;
                throw new Error(
                    `Unknown asset discovery config type: ${JSON.stringify(_exhaustive)}`,
                );
            }
        }
    }

    /**
     * Create OIF Asset Discovery Service
     */
    private createOIFService(
        config: OIFAssetDiscoveryConfig,
        providerId: string,
    ): OIFAssetDiscoveryService {
        return new OIFAssetDiscoveryService({
            baseUrl: config.config.baseUrl,
            solverId: config.config.solverId,
            providerId,
            headers: config.config.headers,
            timeout: config.config.timeout,
        });
    }

    /**
     * Create Relay Asset Discovery Service
     */
    private createRelayService(
        config: RelayAssetDiscoveryConfig,
        providerId: string,
    ): RelayAssetDiscoveryService {
        return new RelayAssetDiscoveryService({
            baseUrl: config.config.baseUrl,
            providerId,
            headers: config.config.headers,
            timeout: config.config.timeout,
        });
    }

    /**
     * Create Custom API Asset Discovery Service
     */
    private createCustomApiService(
        config: CustomApiAssetDiscoveryConfig,
        providerId: string,
    ): CustomApiAssetDiscoveryService {
        return new CustomApiAssetDiscoveryService({
            assetsEndpoint: config.config.assetsEndpoint,
            parseResponse: config.config.parseResponse,
            providerId,
            headers: config.config.headers,
            timeout: config.config.timeout,
        });
    }
}

/**
 * Create an OIF Asset Discovery Service directly
 *
 * Use this when you have the solver URL available.
 * The service starts prefetching immediately.
 *
 * @param config - Service configuration including base URL
 * @returns Configured OIF Asset Discovery Service
 *
 * @example
 * ```typescript
 * const service = createOIFAssetDiscoveryService({
 *   baseUrl: "https://api.solver.com",
 *   providerId: "my-solver",
 * });
 *
 * // Data is already being fetched in the background
 * const assets = await service.getSupportedAssets();
 * ```
 */
export function createOIFAssetDiscoveryService(
    config: OIFAssetDiscoveryServiceConfig,
): OIFAssetDiscoveryService {
    const service = new OIFAssetDiscoveryService(config);
    service.prefetch();
    return service;
}

/**
 * Create an Asset Discovery Service for a provider
 *
 * Convenience function that creates a factory and service in one call.
 * The service starts prefetching immediately.
 *
 * @param provider - The provider to create a service for
 * @returns AssetDiscoveryService instance, or null if provider doesn't support discovery
 */
export function createAssetDiscoveryService(
    provider: CrossChainProvider,
): AssetDiscoveryService | null {
    const factory = new AssetDiscoveryFactory();
    return factory.createService(provider);
}
