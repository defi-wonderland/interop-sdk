import axios from "axios";
import { ZodError } from "zod";

import { AssetDiscoveryFailure } from "../errors/AssetDiscoveryFailure.exception.js";
import { getAssetsResponseSchema } from "../schemas/assetDiscovery.js";
import { AssetDiscoveryResult } from "../types/assetDiscovery.js";
import {
    BaseAssetDiscoveryService,
    BaseAssetDiscoveryServiceConfig,
} from "./BaseAssetDiscoveryService.js";

/**
 * Configuration for OIF Asset Discovery Service
 */
export interface OIFAssetDiscoveryServiceConfig extends BaseAssetDiscoveryServiceConfig {
    /**
     * Base URL of the OIF-compliant solver API
     * @example "https://api.solver.com"
     */
    baseUrl: string;
}

/**
 * OIF Asset Discovery Service Implementation
 *
 * Fetches supported assets from OIF-compliant solvers using the standard
 * /api/tokens endpoint. Includes in-memory caching with configurable TTL.
 */
export class OIFAssetDiscoveryService extends BaseAssetDiscoveryService {
    private readonly baseUrl: string;

    constructor(config: OIFAssetDiscoveryServiceConfig) {
        super(config);
        this.baseUrl = config.baseUrl.replace(/\/$/, ""); // Remove trailing slash
    }

    /**
     * Fetch assets from the OIF API
     */
    protected async fetchAssets(timeout: number): Promise<AssetDiscoveryResult> {
        const url = `${this.baseUrl}/api/tokens`;

        try {
            const response = await axios.get(url, {
                headers: this.headers ?? {},
                timeout,
            });

            if (response.status !== 200) {
                throw new AssetDiscoveryFailure(
                    "Failed to fetch assets from OIF API",
                    `Unexpected status code: ${response.status}. URL: ${url}`,
                );
            }

            // Validate response against schema
            const validated = getAssetsResponseSchema.parse(response.data);

            // Convert from Record<string, NetworkAssets> to NetworkAssets[]
            const networks = Object.values(validated.networks);

            return {
                networks,
                fetchedAt: Date.now(),
                providerId: this.providerId,
            };
        } catch (error) {
            if (error instanceof AssetDiscoveryFailure) {
                throw error;
            }

            if (error instanceof ZodError) {
                throw new AssetDiscoveryFailure(
                    "Failed to validate OIF asset discovery response",
                    error.message,
                    error.stack,
                );
            }

            throw this.wrapError(error, "OIF API", url, timeout);
        }
    }
}
