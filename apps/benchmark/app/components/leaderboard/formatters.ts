export function formatFillCount(value: number | null): string {
  if (value === null || value === 0) return '—';
  return value.toLocaleString('en-US');
}

export function formatSuccessRate(value: number | null): string {
  if (value === null) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

export function formatFillSeconds(value: number | null): string {
  if (value === null) return '—';
  if (value < 1) return `${(value * 1000).toFixed(0)}ms`;
  if (value < 60) return `${value.toFixed(1)}s`;
  const minutes = Math.floor(value / 60);
  const remainder = value % 60;
  return remainder < 1 ? `${minutes}m` : `${minutes}m ${remainder.toFixed(0)}s`;
}

export function formatAvgFee(value: number | null): string {
  if (value === null) return '—';
  return `$${value.toFixed(2)}`;
}
