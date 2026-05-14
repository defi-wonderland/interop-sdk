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
    const discovered = await this.discoverAssets();
    return this.buildNetworks(discovered);
  }

  private discoverAssets(): Promise<DiscoveredAssets> {
    const chainIds = this.chains.map((chain) => chain.id);
    return this.aggregator.discoverAssets({ chainIds });
  }

  private buildNetworks(discovered: DiscoveredAssets): NetworkAssets[] {
    return this.chains
      .map((chain) => ({
        chainId: chain.id,
        assets: this.extractAssets(discovered.tokensByChain[chain.id] ?? [], discovered.tokenMetadata[chain.id] ?? {}),
      }))
      .filter((network) => network.assets.length > 0);
  }

  private extractAssets(
    addresses: readonly string[],
    metadata: DiscoveredAssets['tokenMetadata'][number],
  ): AssetInfo[] {
    const allowed = new Set(this.symbols);
    const bySymbol = new Map<string, AssetInfo>();
    for (const addr of addresses) {
      const meta = metadata[addr.toLowerCase()];
      if (!meta || !allowed.has(meta.symbol) || bySymbol.has(meta.symbol)) continue;
      bySymbol.set(meta.symbol, { ...meta, address: toChecksum(addr) });
    }
    return [...bySymbol.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
  }
}

function toChecksum(address: string): string {
  try {
    return getAddress(address);
  } catch {
    return address;
  }
}
