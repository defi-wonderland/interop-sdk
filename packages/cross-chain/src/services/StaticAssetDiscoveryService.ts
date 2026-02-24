import { NetworkAssets } from "../types/assetDiscovery.js";
import { BaseAssetDiscoveryService } from "./BaseAssetDiscoveryService.js";

export class StaticAssetDiscoveryService extends BaseAssetDiscoveryService {
    private readonly networks: NetworkAssets[];

    constructor(networks: NetworkAssets[], providerId: string) {
        super({ providerId });
        this.networks = networks;
    }

    protected async fetchAssets(): Promise<NetworkAssets[]> {
        return this.networks;
    }
}
