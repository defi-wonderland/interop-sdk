export enum AssetSymbol {
  USDC = 'USDC',
  WETH = 'WETH',
}

export interface AssetMeta {
  symbol: AssetSymbol;
  displayName: string;
  colorClass: string;
  iconUrl: string;
}

export const ASSETS: Record<AssetSymbol, AssetMeta> = {
  [AssetSymbol.USDC]: {
    symbol: AssetSymbol.USDC,
    displayName: 'USDC',
    colorClass: 'bg-asset-usdc',
    iconUrl: '/icons/assets/usdc.svg',
  },
  [AssetSymbol.WETH]: {
    symbol: AssetSymbol.WETH,
    displayName: 'WETH',
    colorClass: 'bg-asset-eth',
    iconUrl: '/icons/assets/weth.svg',
  },
};

export const ASSET_SYMBOLS: readonly AssetSymbol[] = Object.values(AssetSymbol);
