import { getAddress, type Chain } from 'viem';
import type { ChainService } from '../interfaces/chainService.interface';
import type { Aggregator, AssetInfo, DiscoveredAssets, NetworkAssets } from '@wonderland/interop-cross-chain';

export class SDKChainService implements ChainService {
  constructor(
    private readonly aggregator: Aggregator,
    private readonly chains: readonly Chain[],
    private readonly symbols: readonly string[],
  ) {}

  async getChains(): Promise<NetworkAssets[]> {
    const chainIds = this.chains.map((chain) => chain.id);
    const assets = await this.aggregator.discoverAssets({ chainIds });
    return this.toNetworkAssets(assets);
  }

  private toNetworkAssets(assets: DiscoveredAssets): NetworkAssets[] {
    return this.chains
      .map((chain) => ({ chainId: chain.id, assets: this.extractAssets(assets.tokenMetadata[chain.id]) }))
      .filter((network) => network.assets.length > 0);
  }

  private extractAssets(metadata: DiscoveredAssets['tokenMetadata'][number] | undefined): AssetInfo[] {
    if (!metadata) return [];
    const allowed = new Set(this.symbols);
    const result: AssetInfo[] = [];
    for (const raw of Object.values(metadata)) {
      if (!allowed.has(raw.symbol)) continue;
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
