import { AssetDiscoveryResult, NetworkAssets } from "../types/assetDiscovery.js";
import { BaseAssetDiscoveryService } from "./BaseAssetDiscoveryService.js";

export class StaticAssetDiscoveryService extends BaseAssetDiscoveryService {
    private readonly networks: NetworkAssets[];

    constructor(networks: NetworkAssets[], providerId: string) {
        super({ providerId, cacheTtl: Infinity });
        this.networks = networks;
    }

    protected async fetchAssets(): Promise<AssetDiscoveryResult> {
        return {
            networks: this.networks,
            fetchedAt: Date.now(),
            providerId: this.providerId,
        };
    }
}
