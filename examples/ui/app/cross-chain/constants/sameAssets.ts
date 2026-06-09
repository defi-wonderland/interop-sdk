import { arbitrum, base, optimism } from 'viem/chains';
import { DemoToken } from './display';
import type { SameAssetMap } from '@wonderland/interop-cross-chain';

const NATIVE = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

/**
 * Consumer-owned same-asset pairings for the demo's mainnet chains. Discovery keeps
 * these addresses through cross-provider symbol disagreements (e.g. USDT vs USDT0)
 * instead of dropping them, and buildQuote resolves identity through them.
 */
export const SAME_ASSET_MAP: SameAssetMap = {
  [DemoToken.ETH]: {
    [base.id]: NATIVE,
    [arbitrum.id]: NATIVE,
    [optimism.id]: NATIVE,
  },
  [DemoToken.WETH]: {
    [base.id]: '0x4200000000000000000000000000000000000006',
    [arbitrum.id]: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    [optimism.id]: '0x4200000000000000000000000000000000000006',
  },
  [DemoToken.USDC]: {
    [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    [arbitrum.id]: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    [optimism.id]: '0x0b2C639c533813f4Aa9D7837CACDc94539e2117E',
  },
  [DemoToken.USDT]: {
    [base.id]: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    [arbitrum.id]: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    [optimism.id]: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
  },
  [DemoToken.DAI]: {
    [base.id]: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    [arbitrum.id]: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    [optimism.id]: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  },
  [DemoToken.cbBTC]: {
    [base.id]: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
    [arbitrum.id]: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
  },
};
