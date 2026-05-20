import { formatUnits } from 'viem';

const MAX_FRACTION_DIGITS = 4;

export const truncateAddress = (address: string): string =>
  address.length > 10 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;

export const formatEta = (seconds: number | undefined): string => {
  if (seconds === undefined) return '—';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder === 0 ? `${minutes}m` : `${minutes}m ${remainder}s`;
};

export const formatLatency = (ms: number | undefined): string => {
  if (ms === undefined) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

export const formatTokenAmount = (raw: string | undefined, decimals: number): string => {
  if (!raw) return '—';
  try {
    const [whole, fraction = ''] = formatUnits(BigInt(raw), decimals).split('.');
    const trimmed = fraction.slice(0, MAX_FRACTION_DIGITS).replace(/0+$/, '');
    return trimmed ? `${whole}.${trimmed}` : whole;
  } catch {
    return raw;
  }
};

export const formatUsd = (value: string | undefined): string => {
  if (!value) return '—';
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return '—';
  return `$${parsed.toFixed(parsed < 1 ? 4 : 2)}`;
};
