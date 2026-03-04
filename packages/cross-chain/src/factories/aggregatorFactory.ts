import {
    Aggregator,
    AggregatorConfig,
    AssetDiscoveryFactory,
    OrderTrackerFactory,
} from "../internal.js";

/**
 * Create an aggregator with default factories.
 *
 * When `trackerFactory` or `discoveryFactory` are not provided, the defaults
 * (OrderTrackerFactory, AssetDiscoveryFactory) are created automatically.
 *
 * @param config - Configuration including providers, sorting strategy, timeout, and optional factories
 * @returns The aggregator instance
 */
export const createAggregator = (config: AggregatorConfig): Aggregator => {
    return new Aggregator({
        ...config,
        trackerFactory: config.trackerFactory ?? new OrderTrackerFactory(),
        discoveryFactory: config.discoveryFactory ?? new AssetDiscoveryFactory(),
    });
};
