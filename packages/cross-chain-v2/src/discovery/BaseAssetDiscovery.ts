import type {
    AssetDiscoveryOptions,
    AssetDiscoveryResult,
    AssetDiscoveryService,
    NetworkAssets,
} from "./types.js";
import { AssetDiscoveryError } from "../errors.js";

export interface BaseAssetDiscoveryConfig {
    source: string;
    headers?: Record<string, string>;
    cacheTtlMs?: number;
    timeoutMs?: number;
}

interface CacheEntry {
    data: AssetDiscoveryResult;
    expiresAt: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;

export abstract class BaseAssetDiscovery implements AssetDiscoveryService {
    protected readonly source: string;
    protected readonly headers?: Record<string, string>;
    protected readonly cacheTtlMs: number;
    protected readonly timeoutMs: number;

    private cache: CacheEntry | null = null;
    private inFlight: Promise<AssetDiscoveryResult> | null = null;

    constructor(config: BaseAssetDiscoveryConfig) {
        this.source = config.source;
        this.headers = config.headers;
        this.cacheTtlMs = config.cacheTtlMs ?? Infinity;
        this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    }

    protected abstract fetchAssets(timeout: number): Promise<AssetDiscoveryResult>;

    async getSupportedAssets(options?: AssetDiscoveryOptions): Promise<AssetDiscoveryResult> {
        const result = await this.resolve(options);
        return this.filterByChains(result, options?.chainIds);
    }

    async getAssetsForChain(
        chainId: number,
        options?: AssetDiscoveryOptions,
    ): Promise<NetworkAssets | null> {
        const result = await this.resolve(options);
        return result.networks.find((n) => n.chainId === chainId) ?? null;
    }

    async isAssetSupported(
        chainId: number,
        assetAddress: string,
        options?: AssetDiscoveryOptions,
    ): Promise<boolean> {
        const network = await this.getAssetsForChain(chainId, options);
        if (!network) return false;
        const normalized = assetAddress.toLowerCase();
        return network.assets.some((a) => a.address.toLowerCase() === normalized);
    }

    async getSupportedChainIds(options?: AssetDiscoveryOptions): Promise<number[]> {
        const result = await this.resolve(options);
        return result.networks.map((n) => n.chainId);
    }

    clearCache(): void {
        this.cache = null;
        this.inFlight = null;
    }

    private async resolve(options?: AssetDiscoveryOptions): Promise<AssetDiscoveryResult> {
        if (!options?.forceRefresh) {
            if (this.cache && Date.now() < this.cache.expiresAt) return this.cache.data;
            if (this.inFlight) return this.inFlight;
        }

        const timeout = options?.timeout ?? this.timeoutMs;

        const promise = this.fetchAssets(timeout).then((result) => {
            this.cache = { data: result, expiresAt: Date.now() + this.cacheTtlMs };
            return result;
        });

        this.inFlight = promise;
        promise
            .finally(() => {
                if (this.inFlight === promise) this.inFlight = null;
            })
            .catch(() => {});

        return promise;
    }

    private filterByChains(
        result: AssetDiscoveryResult,
        chainIds?: number[],
    ): AssetDiscoveryResult {
        if (!chainIds?.length) return result;
        const set = new Set(chainIds);
        return { ...result, networks: result.networks.filter((n) => set.has(n.chainId)) };
    }

    protected wrapError(error: unknown, context: string, url: string): AssetDiscoveryError {
        if (error instanceof AssetDiscoveryError) return error;
        const msg = error instanceof Error ? error.message : String(error);
        return new AssetDiscoveryError(
            `Failed to fetch assets from ${context}`,
            `${msg}. URL: ${url}`,
        );
    }
}
