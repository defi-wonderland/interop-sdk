import type { Address } from "viem";
import axios from "axios";

import type { BaseAssetDiscoveryConfig } from "./BaseAssetDiscovery.js";
import type { AssetDiscoveryResult, NetworkAssets } from "./types.js";
import { AssetDiscoveryError } from "../errors.js";
import { BaseAssetDiscovery } from "./BaseAssetDiscovery.js";

export interface OIFAssetDiscoveryConfig extends BaseAssetDiscoveryConfig {
    baseUrl: string;
    solverId?: string;
}

export class OIFAssetDiscovery extends BaseAssetDiscovery {
    private readonly baseUrl: string;
    private readonly solverId?: string;

    constructor(config: OIFAssetDiscoveryConfig) {
        super(config);
        this.baseUrl = config.baseUrl.replace(/\/$/, "");
        this.solverId = config.solverId;
    }

    protected async fetchAssets(timeout: number): Promise<AssetDiscoveryResult> {
        if (this.solverId) return this.fetchViaSolverEndpoint(timeout);

        const url = `${this.baseUrl}/api/tokens`;
        try {
            const response = await axios.get(url, {
                headers: this.headers ?? {},
                timeout,
            });

            const data = response.data as {
                networks?: Record<
                    string,
                    {
                        chain_id?: number;
                        chainId?: number;
                        assets?: Array<{
                            address: string;
                            symbol: string;
                            decimals: number;
                            name?: string;
                        }>;
                    }
                >;
            };
            const networks: NetworkAssets[] = [];

            if (data.networks) {
                for (const net of Object.values(data.networks)) {
                    const chainId = net.chain_id ?? net.chainId;
                    if (!chainId || !net.assets) continue;
                    networks.push({
                        chainId,
                        assets: net.assets.map((a) => ({
                            address: a.address as Address,
                            symbol: a.symbol,
                            decimals: a.decimals,
                            name: a.name,
                        })),
                    });
                }
            }

            return { networks, fetchedAt: Date.now(), source: this.source };
        } catch (error) {
            throw this.wrapError(error, "OIF API", url);
        }
    }

    private async fetchViaSolverEndpoint(timeout: number): Promise<AssetDiscoveryResult> {
        const url = `${this.baseUrl}/v1/solvers/${this.solverId}`;
        try {
            const response = await axios.get(url, {
                headers: this.headers ?? {},
                timeout,
            });

            const data = response.data as {
                tokens?: Record<
                    string,
                    Array<{ address: string; symbol: string; decimals: number; name?: string }>
                >;
            };
            const networks: NetworkAssets[] = [];

            if (data.tokens) {
                for (const [chainIdStr, assets] of Object.entries(data.tokens)) {
                    const chainId = Number(chainIdStr);
                    if (isNaN(chainId)) continue;
                    networks.push({
                        chainId,
                        assets: assets.map((a) => ({
                            address: a.address as Address,
                            symbol: a.symbol,
                            decimals: a.decimals,
                            name: a.name,
                        })),
                    });
                }
            }

            return { networks, fetchedAt: Date.now(), source: this.source };
        } catch (error) {
            throw this.wrapError(error, "OIF solver (workaround)", url);
        }
    }
}
