import axios from "axios";

import { AssetDiscoveryFailure } from "../errors/AssetDiscoveryFailure.exception.js";
import { AssetDiscoveryResult, NetworkAssets } from "../types/assetDiscovery.js";
import {
    BaseAssetDiscoveryService,
    BaseAssetDiscoveryServiceConfig,
} from "./BaseAssetDiscoveryService.js";

/**
 * Configuration for Custom API Asset Discovery Service
 */
export interface CustomApiAssetDiscoveryServiceConfig extends BaseAssetDiscoveryServiceConfig {
    /**
     * Endpoint URL for fetching all assets
     */
    assetsEndpoint: string;
    /**
     * Function to transform API response to SDK types
     * This function should throw on invalid data (e.g., ZodError)
     */
    parseResponse: (data: unknown) => NetworkAssets[];
}

/**
 * Custom API Asset Discovery Service Implementation
 *
 * Fetches supported assets from custom API endpoints and transforms them
 * using a protocol-specific parseResponse function.
 * Includes in-memory caching with configurable TTL.
 */
export class CustomApiAssetDiscoveryService extends BaseAssetDiscoveryService {
    private readonly assetsEndpoint: string;
    private readonly parseResponse: (data: unknown) => NetworkAssets[];

    constructor(config: CustomApiAssetDiscoveryServiceConfig) {
        super(config);
        this.assetsEndpoint = config.assetsEndpoint;
        this.parseResponse = config.parseResponse;
    }

    /**
     * Fetch assets from the custom API
     */
    protected async fetchAssets(timeout: number): Promise<AssetDiscoveryResult> {
        try {
            const response = await axios.get(this.assetsEndpoint, {
                headers: {
                    "Content-Type": "application/json",
                    ...this.headers,
                },
                timeout,
            });

            if (response.status !== 200) {
                throw new AssetDiscoveryFailure(
                    "Failed to fetch assets from custom API",
                    `Unexpected status code: ${response.status}. URL: ${this.assetsEndpoint}`,
                );
            }

            const networks = this.parseResponse(response.data);

            return {
                networks,
                fetchedAt: Date.now(),
                providerId: this.providerId,
            };
        } catch (error) {
            if (error instanceof AssetDiscoveryFailure) {
                throw error;
            }

            throw this.wrapError(error, "custom API", this.assetsEndpoint);
        }
    }
}
