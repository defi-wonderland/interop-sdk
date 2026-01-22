import { parseUnits } from 'viem';
import type { TokenInfo } from '@wonderland/interop-cross-chain';

/**
 * Converts a human-readable amount to the smallest unit (wei/smallest unit)
 * @param amount - Human-readable amount (e.g., "0.01")
 * @param tokenAddress - Token address to get decimals from
 * @param chainId - Chain ID where the token exists
 * @param tokenInfo - Token info map by chain ID and token address
 * @returns Amount in smallest unit as string
 */
export function convertAmountToSmallestUnit(
  amount: string,
  tokenAddress: string,
  chainId: number,
  tokenInfo: Record<number, Record<string, TokenInfo>>,
): string {
  const token = tokenInfo[chainId]?.[tokenAddress];
  const decimals = token?.decimals || 18;

  try {
    const parsed = parseUnits(amount, decimals);
    return parsed.toString();
  } catch (error) {
    throw new Error(`Failed to convert amount: ${error instanceof Error ? error.message : 'Invalid amount'}`);
  }
}
