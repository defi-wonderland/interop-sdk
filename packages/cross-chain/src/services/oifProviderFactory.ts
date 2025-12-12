import type { OifProviderConfig } from "../interfaces/OifProvider.interface.js";
import { OifProvider } from "../internal.js";

/**
 * Creates an OifProvider instance
 * @param config - The configuration for the OIF provider
 * @returns An OifProvider instance
 */
export const createOifProvider = (config: OifProviderConfig): OifProvider => {
    return new OifProvider(config);
};
