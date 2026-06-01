export function formatFillCount(value: number | null): string {
  if (value === null) return '—';
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
  // Round whole seconds first so a remainder of 59.6 cannot render as `1m 60s`
  // when the standalone-seconds rounding would otherwise push it past the minute.
  const totalSeconds = Math.round(value);
  const minutes = Math.floor(totalSeconds / 60);
  const remainderSeconds = totalSeconds % 60;
  return remainderSeconds === 0 ? `${minutes}m` : `${minutes}m ${remainderSeconds}s`;
}

export function formatAvgFee(value: number | null): string {
  if (value === null) return '—';
  return `$${value.toFixed(2)}`;
}
