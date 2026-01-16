import type { PublicClient } from "viem";

import type { FillWatcher, OpenedIntentParser } from "../internal.js";

/**
 * Configuration for OrderTrackerFactory
 */
export interface OrderTrackerFactoryConfig {
    publicClient?: PublicClient;
    rpcUrls?: Record<number, string>;
}

/**
 * Configuration for creating an OrderTracker
 */
export interface OrderTrackerConfig extends OrderTrackerFactoryConfig {
    openedIntentParser?: OpenedIntentParser;
    fillWatcher?: FillWatcher;
}
