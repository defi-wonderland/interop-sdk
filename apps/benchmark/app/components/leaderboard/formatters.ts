const PLACEHOLDER = '—';

function isUsableNumber(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

export function formatFillCount(value: number | null): string {
  if (!isUsableNumber(value) || value < 0) return PLACEHOLDER;
  return Math.trunc(value).toLocaleString('en-US');
}

// Compact span the sample covers: `45m`, `8h`, `2.7d`. Days keep one decimal
// under 10d (2.7d reads better than 3d) and round above it (33d, not 33.1d).
export function formatSampleWindow(value: number | null): string {
  if (!isUsableNumber(value) || value < 0) return PLACEHOLDER;
  const minutes = value / 60;
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = hours / 24;
  return days < 10 ? `${days.toFixed(1)}d` : `${Math.round(days)}d`;
}

export function formatSuccessRate(value: number | null): string {
  if (!isUsableNumber(value)) return PLACEHOLDER;
  // Clamp to [0, 100]: upstream rounding occasionally produces 1.0001 etc.
  const percent = Math.max(0, Math.min(100, value * 100));
  return `${percent.toFixed(1)}%`;
}

export function formatFillSeconds(value: number | null): string {
  if (!isUsableNumber(value) || value < 0) return PLACEHOLDER;
  if (value < 1) return `${Math.round(value * 1000)}ms`;
  if (value < 60) {
    // Round before unit selection so 59.96 doesn't render as `60.0s`. If
    // rounding tips it past the minute boundary, fall through to the minute
    // branch instead.
    const roundedSeconds = Math.round(value * 10) / 10;
    if (roundedSeconds < 60) return `${roundedSeconds.toFixed(1)}s`;
  }
  // Round whole seconds first so a remainder of 59.6 cannot render as `1m 60s`
  // when the standalone-seconds rounding would otherwise push it past the minute.
  const totalSeconds = Math.round(value);
  const minutes = Math.floor(totalSeconds / 60);
  const remainderSeconds = totalSeconds % 60;
  return remainderSeconds === 0 ? `${minutes}m` : `${minutes}m ${remainderSeconds}s`;
}

export function formatAvgFee(value: number | null): string {
  if (!isUsableNumber(value) || value < 0) return PLACEHOLDER;
  return `$${value.toFixed(2)}`;
}
