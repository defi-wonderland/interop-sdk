import type { TokenInfo } from '@wonderland/interop-cross-chain';

export interface UITokenInfo extends TokenInfo {
  providers: string[];
}

export interface DiscoveredAssets {
  supportedTokensByChain: Record<number, readonly string[]>;
  tokenInfo: Record<number, Record<string, UITokenInfo>>;
  supportedChainIds: number[];
}
