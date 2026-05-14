import { getAddress } from 'viem';
import type { ChainService } from '../interfaces/chainService.interface';
import type { Aggregator, AssetInfo, DiscoveredAssets, NetworkAssets } from '@wonderland/interop-cross-chain';

export class SDKChainService implements ChainService {
  constructor(private readonly aggregator: Aggregator) {}

  async getChains(): Promise<NetworkAssets[]> {
    const assets = await this.aggregator.discoverAssets();
    return this.toNetworkAssets(assets);
  }

  private toNetworkAssets(assets: DiscoveredAssets): NetworkAssets[] {
    return Object.keys(assets.tokensByChain)
      .map(Number)
      .filter(Number.isFinite)
      .sort((a, b) => a - b)
      .map((chainId) => ({ chainId, assets: this.extractAssets(assets.tokenMetadata[chainId]) }))
      .filter((network) => network.assets.length > 0);
  }

  private extractAssets(metadata: DiscoveredAssets['tokenMetadata'][number] | undefined): AssetInfo[] {
    if (!metadata) return [];
    const seen = new Set<string>();
    const result: AssetInfo[] = [];
    for (const raw of Object.values(metadata)) {
      if (!raw.symbol || seen.has(raw.symbol)) continue;
      seen.add(raw.symbol);
      result.push({ ...raw, address: this.toChecksumAddress(raw.address) });
    }
    return result.sort((a, b) => a.symbol.localeCompare(b.symbol));
  }

  private toChecksumAddress(address: string): string {
    try {
      return getAddress(address);
    } catch {
      return address;
    }
  }
}
