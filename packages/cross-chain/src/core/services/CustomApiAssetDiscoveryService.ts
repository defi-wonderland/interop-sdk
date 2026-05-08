import { NetworkAssets } from "../types/assetDiscovery.js";
import { httpRequest } from "../utils/httpClient.js";
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
 * Results are cached permanently after the first fetch.
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
    protected async fetchAssets(): Promise<NetworkAssets[]> {
        const response = await httpRequest(this.assetsEndpoint, {
            headers: this.headers,
            timeout: this.timeout,
        });

        return this.parseResponse(response.data);
    }
}
