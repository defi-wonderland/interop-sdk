import type { AggregatorConfig, CrossChainProvider, OptionalConfigProtocols } from "../internal.js";
import { Aggregator, AssetDiscoveryFactory, OrderTrackerFactory } from "../internal.js";
import { createCrossChainProvider } from "./crossChainProviderFactory.js";

/** A provider instance, or an optional-config protocol name to instantiate with defaults. */
export type AggregatorProvider = CrossChainProvider | OptionalConfigProtocols;

/** Like {@link AggregatorConfig}, but `providers` also accepts protocol names. */
export interface CreateAggregatorConfig extends Omit<AggregatorConfig, "providers"> {
    providers: AggregatorProvider[];
}

/** Creates an aggregator, resolving protocol names to providers and applying default factories. */
export const createAggregator = (config: CreateAggregatorConfig): Aggregator => {
    const providers = config.providers.map((provider) =>
        typeof provider === "string" ? createCrossChainProvider(provider) : provider,
    );
    return new Aggregator({
        ...config,
        providers,
        trackerFactory: config.trackerFactory ?? new OrderTrackerFactory(),
        discoveryFactory: config.discoveryFactory ?? new AssetDiscoveryFactory(),
    });
};
