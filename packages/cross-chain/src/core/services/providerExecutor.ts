/**
 * @deprecated Use {@link Aggregator} and {@link createAggregator} from "./aggregator.js" instead.
 *
 * This module re-exports the Aggregator under the old names for backward compatibility.
 * It will be removed in a future major version.
 */

import type { AggregatorConfig } from "./aggregator.js";
import { Aggregator, createAggregator } from "./aggregator.js";

/** @deprecated Use {@link Aggregator} instead */
const ProviderExecutor = Aggregator;
type ProviderExecutor = Aggregator;

/** @deprecated Use {@link AggregatorConfig} instead */
type ProviderExecutorConfig = AggregatorConfig;

/** @deprecated Use {@link createAggregator} instead */
const createProviderExecutor = createAggregator;

export { ProviderExecutor, createProviderExecutor };
export type { ProviderExecutorConfig };
