import axios from "axios";

import type { NetworkAssets } from "../../../core/types/assetDiscovery.js";
import { AssetDiscoveryFailure } from "../../../core/errors/AssetDiscoveryFailure.exception.js";
import {
    BaseAssetDiscoveryService,
    BaseAssetDiscoveryServiceConfig,
} from "../../../core/services/BaseAssetDiscoveryService.js";
import { LifiIntentsRoutesResponseSchema } from "../schemas.js";

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
        });

        if (response.status !== 200) {
            throw new AssetDiscoveryFailure(
                "Failed to fetch routes from LI.FI order server",
                `Status: ${response.status}, URL: ${this.orderServerUrl}/routes`,
            );
        }

        const { routes } = LifiIntentsRoutesResponseSchema.parse(response.data);
        const chainAssetMap = new Map<
            number,
            Map<string, { address: string; symbol: string; decimals: number }>
        >();

        for (const route of routes) {
            const fromChainId = Number(route.fromChain.chainId);
            const toChainId = Number(route.toChain.chainId);
            addToMap(chainAssetMap, fromChainId, route.fromToken);
            addToMap(chainAssetMap, toChainId, route.toToken);
        }

        return Array.from(chainAssetMap.entries()).map(([chainId, assets]) => ({
            chainId,
            assets: Array.from(assets.values()),
        }));
    }
}

function addToMap(
    map: Map<number, Map<string, { address: string; symbol: string; decimals: number }>>,
    chainId: number,
    token: { address: string; symbol: string | null; decimals: number },
): void {
    if (!map.has(chainId)) {
        map.set(chainId, new Map());
    }
    const key = token.address.toLowerCase();
    if (!map.get(chainId)!.has(key)) {
        map.get(chainId)!.set(key, {
            address: token.address,
            symbol: token.symbol ?? "",
            decimals: token.decimals,
        });
    }
}
