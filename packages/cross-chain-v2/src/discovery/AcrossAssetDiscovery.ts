import type { Address } from "viem";
import { getAcrossApiUrl } from "@wonderland/interop-cross-chain";
import axios from "axios";

import type { BaseAssetDiscoveryConfig } from "./BaseAssetDiscovery.js";
import type { AssetDiscoveryResult, NetworkAssets } from "./types.js";
import { BaseAssetDiscovery } from "./BaseAssetDiscovery.js";

export interface AcrossAssetDiscoveryConfig extends Omit<BaseAssetDiscoveryConfig, "source"> {
    apiUrl?: string;
    isTestnet?: boolean;
}

interface AcrossTokenEntry {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    chainId: number;
}

export class AcrossAssetDiscovery extends BaseAssetDiscovery {
    private readonly apiUrl: string;

    constructor(config: AcrossAssetDiscoveryConfig = {}) {
        const isTestnet = config.isTestnet ?? false;
        const apiUrl = config.apiUrl ?? getAcrossApiUrl(isTestnet);
        super({ ...config, source: `across:${isTestnet ? "testnet" : "mainnet"}` });
        this.apiUrl = apiUrl;
    }

    protected async fetchAssets(timeout: number): Promise<AssetDiscoveryResult> {
        const url = `${this.apiUrl}/swap/tokens`;
        try {
            const response = await axios.get<AcrossTokenEntry[]>(url, {
                headers: this.headers ?? {},
                timeout,
            });

            const byChain = new Map<number, NetworkAssets>();

            for (const token of response.data) {
                let network = byChain.get(token.chainId);
                if (!network) {
                    network = { chainId: token.chainId, assets: [] };
                    byChain.set(token.chainId, network);
                }
                network.assets.push({
                    address: token.address as Address,
                    symbol: token.symbol,
                    decimals: token.decimals,
                    name: token.name,
                });
            }

            return { networks: [...byChain.values()], fetchedAt: Date.now(), source: this.source };
        } catch (error) {
            throw this.wrapError(error, "Across API", url);
        }
    }
}
