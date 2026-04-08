export const DEFAULT_DECIMALS = 18;
export const DEFAULT_DISPLAY_DECIMALS = 4;
export const USD_DISPLAY_DECIMALS = 4;
export const PERCENTAGE_DECIMALS = 2;
export const UNKNOWN_TOKEN_SYMBOL = 'TOKEN';
export const NOT_AVAILABLE = 'N/A';
export const UNKNOWN_PROVIDER = 'Unknown Provider';

/**
 * Tokens shown in the demo app. Adding a new value here requires
 * a matching entry in DEMO_MAX_AMOUNT (enforced by the Record type).
 */
export enum DemoToken {
  ETH = 'ETH',
  WETH = 'WETH',
  USDC = 'USDC',
  USDT = 'USDT',
  DAI = 'DAI',
  WBTC = 'WBTC',
  cbBTC = 'cbBTC',
  mockUSDC = 'mockUSDC',
}

/**
 * Maximum input amounts per token symbol for the demo app.
 * Values are denominated in their native unit (e.g. 100 USDC, 0.03 ETH).
 */
export const DEMO_MAX_AMOUNT: Record<DemoToken, number> = {
  [DemoToken.USDC]: 100,
  [DemoToken.USDT]: 100,
  [DemoToken.DAI]: 100,
  [DemoToken.mockUSDC]: 100,
  [DemoToken.ETH]: 0.03,
  [DemoToken.WETH]: 0.03,
  [DemoToken.WBTC]: 0.001,
  [DemoToken.cbBTC]: 0.001,
};
