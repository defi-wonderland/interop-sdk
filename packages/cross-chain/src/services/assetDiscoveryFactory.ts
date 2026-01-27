/**
 * Asset Discovery Factory
 *
 * Creates AssetDiscoveryService instances based on provider configuration.
 * Follows the same pattern as IntentTrackerFactory.
 */

import {
    AssetDiscoveryConfig,
    AssetDiscoveryResult,
    AssetDiscoveryService,
    AssetInfo,
    CrossChainProvider,
    NetworkAssets,
    OIFAssetDiscoveryService,
    OIFAssetDiscoveryServiceConfig,
} from "../internal.js";

/**
 * Configuration for the Asset Discovery Factory
 */
export interface AssetDiscoveryFactoryConfig {
    /**
     * Default cache TTL in milliseconds
     * @default 300000 (5 minutes)
     */
    defaultCacheTtl?: number;
}

/**
 * Static asset discovery service implementation
 *
 * Returns hardcoded data - useful for testing or providers with static asset lists
 */
class StaticAssetDiscoveryService implements AssetDiscoveryService {
    private readonly networks: NetworkAssets[];
    private readonly providerId: string;

    constructor(networks: NetworkAssets[], providerId: string) {
        this.networks = networks;
        this.providerId = providerId;
    }

    async getSupportedAssets(): Promise<AssetDiscoveryResult> {
        return {
            networks: this.networks,
            fetchedAt: Date.now(),
            providerId: this.providerId,
        };
    }

    async getAssetsForChain(chainId: number): Promise<NetworkAssets | null> {
        return this.networks.find((n) => n.chainId === chainId) ?? null;
    }

    async isAssetSupported(chainId: number, assetAddress: string): Promise<AssetInfo | null> {
        const network = await this.getAssetsForChain(chainId);
        if (!network) return null;

        const normalizedAddress = assetAddress.toLowerCase();
        return (
            network.assets.find((asset) => asset.address.toLowerCase() === normalizedAddress) ??
            null
        );
    }

    async getSupportedChainIds(): Promise<number[]> {
        return this.networks.map((n) => n.chainId);
    }
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
                // Custom API support will be added in PR2
                throw new Error(
                    "Custom API asset discovery not yet implemented. " +
                        "This will be added in a future PR.",
                );

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
        config: {
            type: "oif";
            config: { baseUrl: string; headers?: Record<string, string>; cacheTtl?: number };
        },
        providerId: string,
    ): OIFAssetDiscoveryService {
        return new OIFAssetDiscoveryService({
            baseUrl: config.config.baseUrl,
            providerId,
            headers: config.config.headers,
            cacheTtl: config.config.cacheTtl ?? this.config.defaultCacheTtl,
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
