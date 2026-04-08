export const DEFAULT_DECIMALS = 18;
export const DEFAULT_DISPLAY_DECIMALS = 4;
export const USD_DISPLAY_DECIMALS = 4;
export const PERCENTAGE_DECIMALS = 2;
export const UNKNOWN_TOKEN_SYMBOL = 'TOKEN';
export const NOT_AVAILABLE = 'N/A';
export const UNKNOWN_PROVIDER = 'Unknown Provider';

/**
 * Maximum input amounts per token symbol for the demo app.
 * Values are denominated in their native unit (e.g. 100 USDC, 0.03 ETH).
 */
export const DEMO_MAX_AMOUNT: Record<string, number> = {
  USDC: 100,
  USDT: 100,
  DAI: 100,
  ETH: 0.03,
  WETH: 0.03,
  BTC: 0.001,
  WBTC: 0.001,
};
