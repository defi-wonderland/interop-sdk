import { formatUnits } from 'viem';
import {
  DEFAULT_DECIMALS,
  DEFAULT_DISPLAY_DECIMALS,
  PERCENTAGE_DECIMALS,
  USD_DISPLAY_DECIMALS,
} from '../constants/display';

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
 * Formats a USD amount for display
 * @param amountUsd - USD amount as string (e.g., "0.0005")
 * @param decimals - Number of decimal places (default: 4)
 * @returns Formatted USD string with $ prefix (e.g., "$0.0005")
 */
export function formatUsdAmount(amountUsd: string, decimals: number = USD_DISPLAY_DECIMALS): string {
  try {
    const value = parseFloat(amountUsd);
    // For very small values, use more precision
    if (value > 0 && value < 0.0001) {
      return `$${value.toFixed(6)}`;
    }
    return `$${value.toFixed(decimals)}`;
  } catch {
    return `$${amountUsd}`;
  }
}

/**
 * Formats ETA from seconds to human-readable format
 * @param seconds - ETA in seconds
 * @returns Formatted ETA string (e.g., "5 min", "30 sec", "~1 sec")
 */
export function formatETA(seconds: number): string {
  if (seconds < 1) {
    return '~1 sec';
  }
  if (seconds < SECONDS_PER_MINUTE) {
    return `${Math.round(seconds)} sec`;
  }
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

/**
 * Formats a date to a human-readable string
 * @param date - Date object or ISO string
 * @returns Formatted date string (e.g., "Jan 13, 2026 at 8:17 PM")
 */
export function formatDate(date: Date | string): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(dateObj);
  } catch {
    return String(date);
  }
}

/**
 * Replaces ISO timestamps in a message with human-readable dates
 * @param message - Message that may contain ISO timestamp strings
 * @returns Message with ISO timestamps replaced by human-readable dates
 */
export function formatMessageWithDate(message: string): string {
  const isoDateRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z/g;
  return message.replace(isoDateRegex, (isoDate) => formatDate(isoDate));
}
