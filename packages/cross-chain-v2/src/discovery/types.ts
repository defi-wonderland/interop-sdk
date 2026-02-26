import type { Address } from "viem";

export interface AssetInfo {
    address: Address;
    symbol: string;
    decimals: number;
    name?: string;
}

export interface NetworkAssets {
    chainId: number;
    assets: AssetInfo[];
}

export interface AssetDiscoveryResult {
    networks: NetworkAssets[];
    fetchedAt: number;
    source: string;
}

export interface AssetDiscoveryOptions {
    chainIds?: number[];
    forceRefresh?: boolean;
    timeout?: number;
}

export interface AssetDiscoveryService {
    getSupportedAssets(options?: AssetDiscoveryOptions): Promise<AssetDiscoveryResult>;
    getAssetsForChain(
        chainId: number,
        options?: AssetDiscoveryOptions,
    ): Promise<NetworkAssets | null>;
    isAssetSupported(
        chainId: number,
        assetAddress: string,
        options?: AssetDiscoveryOptions,
    ): Promise<boolean>;
    getSupportedChainIds(options?: AssetDiscoveryOptions): Promise<number[]>;
    clearCache(): void;
}
