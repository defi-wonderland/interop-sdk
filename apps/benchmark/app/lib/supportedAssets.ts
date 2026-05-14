import { arbitrum, base, mainnet, optimism } from 'viem/chains';
import type { Chain } from 'viem';

export const SUPPORTED_CHAINS: readonly Chain[] = [mainnet, base, arbitrum, optimism];

export const SUPPORTED_SYMBOLS: readonly string[] = ['USDC', 'WETH'];
