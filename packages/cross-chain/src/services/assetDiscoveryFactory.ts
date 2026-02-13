import {
    AssetDiscoveryConfig,
    AssetDiscoveryService,
    CrossChainProvider,
    CustomApiAssetDiscoveryConfig,
    CustomApiAssetDiscoveryService,
    OIFAssetDiscoveryConfig,
    OIFAssetDiscoveryService,
    OIFAssetDiscoveryServiceConfig,
    StaticAssetDiscoveryService,
} from "../internal.js";

/**
 * Configuration for the Asset Discovery Factory
 */
export interface AssetDiscoveryFactoryConfig {
    /**
     * Default cache TTL in milliseconds.
     * Asset lists rarely change, so the default is Infinity.
     * Use `forceRefresh: true` to explicitly refresh when needed.
     * @default Infinity
     */
    defaultCacheTtl?: number;
}

/**
 * Factory for creating AssetDiscoveryService instances
 *
 * Similar to IntentTrackerFactory, this creates the appropriate service
 * based on the provider's discovery configuration.
 *
 * @example
 * ```typescript
 * const factory = new AssetDiscoveryFactory();
 *
 * // Create service for a provider that supports discovery
 * const service = factory.createService(oifProvider);
 *
 * if (service) {
 *   const assets = await service.getSupportedAssets();
 *   console.log(`Found ${assets.networks.length} chains`);
 * }
 * ```
 */
export class AssetDiscoveryFactory {
    private readonly config: AssetDiscoveryFactoryConfig;

    constructor(config?: AssetDiscoveryFactoryConfig) {
        this.config = config ?? {};
    }

    /**
     * Create an AssetDiscoveryService for a provider
     *
     * @param provider - The provider to create a service for
     * @returns AssetDiscoveryService instance, or null if provider doesn't support discovery
     */
    createService(provider: CrossChainProvider): AssetDiscoveryService | null {
        const config = provider.getDiscoveryConfig?.();

        if (!config) {
            return null;
        }

        return this.createServiceFromConfig(config, provider.getProviderId());
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
            cacheTtl: config.config.cacheTtl ?? this.config.defaultCacheTtl,
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
            cacheTtl: config.config.cacheTtl ?? this.config.defaultCacheTtl,
            timeout: config.config.timeout,
        });
    }
}

/**
 * Create an OIF Asset Discovery Service directly
 *
 * Use this when you have the solver URL available.
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
 * const assets = await service.getSupportedAssets();
 * ```
 */
export function createOIFAssetDiscoveryService(
    config: OIFAssetDiscoveryServiceConfig,
): OIFAssetDiscoveryService {
    return new OIFAssetDiscoveryService(config);
}

/**
 * Create an Asset Discovery Service for a provider
 *
 * Convenience function that creates a factory and service in one call.
 *
 * @param provider - The provider to create a service for
 * @param factoryConfig - Optional factory configuration
 * @returns AssetDiscoveryService instance, or null if provider doesn't support discovery
 */
export function createAssetDiscoveryService(
    provider: CrossChainProvider,
    factoryConfig?: AssetDiscoveryFactoryConfig,
): AssetDiscoveryService | null {
    const factory = new AssetDiscoveryFactory(factoryConfig);
    return factory.createService(provider);
}
