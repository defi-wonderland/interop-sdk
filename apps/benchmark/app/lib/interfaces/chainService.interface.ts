import type { NetworkAssets } from '@wonderland/interop-cross-chain';

export interface ChainService {
  getChains(): Promise<NetworkAssets[]>;
}
