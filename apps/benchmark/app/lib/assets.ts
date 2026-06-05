export enum AssetSymbol {
  USDC = 'USDC',
  WETH = 'WETH',
}

export interface AssetPreset {
  label: string;
  amount: string;
}

export interface AssetMeta {
  symbol: AssetSymbol;
  displayName: string;
  colorClass: string;
  iconUrl: string;
  /**
   * Quick-amount presets denominated in this asset. A raw USD figure only
   * makes sense for USD-pegged assets, so each asset carries its own amounts.
   * Index-aligned across assets (small / medium / large) so switching assets
   * can re-apply the equivalent magnitude.
   */
  presets: readonly AssetPreset[];
}

export const ASSETS: Record<AssetSymbol, AssetMeta> = {
  [AssetSymbol.USDC]: {
    symbol: AssetSymbol.USDC,
    displayName: 'USDC',
    colorClass: 'bg-asset-usdc',
    iconUrl: '/icons/assets/usdc.svg',
    presets: [
      { label: '$100', amount: '100.00' },
      { label: '$1k', amount: '1,000.00' },
      { label: '$10k', amount: '10,000.00' },
    ],
  },
  [AssetSymbol.WETH]: {
    symbol: AssetSymbol.WETH,
    displayName: 'WETH',
    colorClass: 'bg-asset-eth',
    iconUrl: '/icons/assets/weth.svg',
    presets: [
      { label: '0.05', amount: '0.05' },
      { label: '0.5', amount: '0.5' },
      { label: '5', amount: '5' },
    ],
  },
};

export const ASSET_SYMBOLS: readonly AssetSymbol[] = Object.values(AssetSymbol);
