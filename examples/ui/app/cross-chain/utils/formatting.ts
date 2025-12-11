import { formatUnits } from 'viem';
import { DEFAULT_DECIMALS, DEFAULT_DISPLAY_DECIMALS, PERCENTAGE_DECIMALS } from '../constants/display';

const SECONDS_PER_MINUTE = 60;

/**
 * Formats an amount from smallest unit to human-readable format
 * @param amount - Amount in smallest unit (wei/smallest unit) as string
 * @param decimals - Token decimals (default: 18)
 * @param displayDecimals - Number of decimal places to display (default: 4)
 * @returns Formatted amount string
 */
export function formatAmount(
  amount: string,
  decimals: number = DEFAULT_DECIMALS,
  displayDecimals: number = DEFAULT_DISPLAY_DECIMALS,
): string {
  try {
    return parseFloat(formatUnits(BigInt(amount), decimals)).toFixed(displayDecimals);
  } catch {
    return amount;
  }
}

/**
 * Formats a percentage value
 * @param percent - Percentage as string or number
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string
 */
export function formatPercentage(percent: string | number, decimals: number = PERCENTAGE_DECIMALS): string {
  try {
    return Number(percent).toFixed(decimals);
  } catch {
    return String(percent);
  }
}

/**
 * Formats ETA from seconds to human-readable format
 * @param seconds - ETA in seconds
 * @returns Formatted ETA string (e.g., "5 min")
 */
export function formatETA(seconds: number): string {
  const minutes = Math.round(seconds / SECONDS_PER_MINUTE);
  return `${minutes} min`;
}

/**
 * Truncates an address to show first 6 and last 4 characters
 * @param address - Full address string
 * @returns Truncated address (e.g., "0x1234...5678")
 */
export function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
