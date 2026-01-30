import type { Address, Hash } from 'viem';

/**
 * Mint operation status
 */
export const MINT_STATUS = {
  IDLE: 'idle',
  PENDING: 'pending',
  CONFIRMING: 'confirming',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

export type MintStatus = (typeof MINT_STATUS)[keyof typeof MINT_STATUS];

/**
 * Mintable token info
 */
export interface MintableToken {
  chainId: number;
  address: Address;
  symbol: string;
  decimals: number;
}

/**
 * Mint state
 */
export interface MintState {
  status: MintStatus;
  txHash: Hash | null;
  error: string | null;
}
