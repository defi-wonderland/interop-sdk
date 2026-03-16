import type { PreTracker, PreTrackerConfig } from "../internal.js";
import { APIPreTracker } from "../internal.js";

/**
 * Factory for creating {@link PreTracker} instances from provider config.
 */
export class PreTrackerFactory {
    /**
     * Create a PreTracker based on the config type.
     *
     * @param config - Discriminated union returned by {@link CrossChainProvider.getTrackingConfig}
     * @returns A configured PreTracker instance
     */
    create(config: PreTrackerConfig): PreTracker {
        switch (config.type) {
            case "api":
                return new APIPreTracker(config);
        }
    }
}
