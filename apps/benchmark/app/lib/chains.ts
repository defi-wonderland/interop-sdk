export enum ChainId {
  Ethereum = 1,
  Optimism = 10,
  Base = 8453,
  Arbitrum = 42161,
}

export interface ChainMeta {
  id: ChainId;
  displayName: string;
  colorClass: string;
  iconUrl: string;
}

export const CHAINS: Record<ChainId, ChainMeta> = {
  [ChainId.Ethereum]: {
    id: ChainId.Ethereum,
    displayName: 'Ethereum',
    colorClass: 'bg-text-muted',
    iconUrl: '/icons/chains/ethereum.svg',
  },
  [ChainId.Optimism]: {
    id: ChainId.Optimism,
    displayName: 'Optimism',
    colorClass: 'bg-chain-optimism',
    iconUrl: '/icons/chains/optimism.svg',
  },
  [ChainId.Base]: {
    id: ChainId.Base,
    displayName: 'Base',
    colorClass: 'bg-chain-base',
    iconUrl: '/icons/chains/base.svg',
  },
  [ChainId.Arbitrum]: {
    id: ChainId.Arbitrum,
    displayName: 'Arbitrum',
    colorClass: 'bg-chain-arbitrum',
    iconUrl: '/icons/chains/arbitrum.svg',
  },
};

export const CHAIN_IDS: readonly ChainId[] = [ChainId.Ethereum, ChainId.Optimism, ChainId.Base, ChainId.Arbitrum];
