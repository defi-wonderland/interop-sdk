import axios from "axios";

import type { NetworkAssets } from "../../../core/types/assetDiscovery.js";
import { AssetDiscoveryFailure } from "../../../core/errors/AssetDiscoveryFailure.exception.js";
import {
    BaseAssetDiscoveryService,
    BaseAssetDiscoveryServiceConfig,
} from "../../../core/services/BaseAssetDiscoveryService.js";
import { parseRoutesIntoAssets } from "./parseRoutes.js";

export interface LifiIntentsAssetDiscoveryServiceConfig extends BaseAssetDiscoveryServiceConfig {
    orderServerUrl: string;
}

/**
 * Discovers supported assets by fetching available routes from the LI.FI order server.
 * Each route declares a fromChainId/fromAsset → toChainId/toAsset pair.
 * We flatten both sides into a deduplicated set of chain → asset entries.
 */
export class LifiIntentsAssetDiscoveryService extends BaseAssetDiscoveryService {
    private readonly orderServerUrl: string;

    constructor(config: LifiIntentsAssetDiscoveryServiceConfig) {
        super(config);
        this.orderServerUrl = config.orderServerUrl;
    }

    protected async fetchAssets(): Promise<NetworkAssets[]> {
        const response = await axios.get(`${this.orderServerUrl}/routes`, {
            headers: this.headers,
            timeout: this.timeout,
            validateStatus: () => true,
        });

        if (response.status !== 200) {
            throw new AssetDiscoveryFailure(
                "Failed to fetch routes from LI.FI order server",
                `Status: ${response.status}, URL: ${this.orderServerUrl}/routes`,
            );
        }

        return parseRoutesIntoAssets(response.data);
    }
}
