import { parseUnits } from 'viem';

/**
 * Converts a human-readable amount to the smallest unit (wei/smallest unit)
 * @param amount - Human-readable amount (e.g., "0.01")
 * @param tokenAddress - Token address to get decimals from
 * @param tokenMetadata - Token metadata map keyed by address
 * @returns Amount in smallest unit as string
 */
export function convertAmountToSmallestUnit(
  amount: string,
  tokenAddress: string,
  tokenMetadata: Record<string, { decimals: number }>,
): string {
  const token = tokenMetadata[tokenAddress];
  const decimals = token?.decimals || 18;

  try {
    const parsed = parseUnits(amount, decimals);
    return parsed.toString();
  } catch (error) {
    throw new Error(`Failed to convert amount: ${error instanceof Error ? error.message : 'Invalid amount'}`);
  }
}
