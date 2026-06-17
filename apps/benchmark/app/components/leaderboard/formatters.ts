const PLACEHOLDER = '—';

function isUsableNumber(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

export function formatFillCount(value: number | null): string {
  if (!isUsableNumber(value) || value < 0) return PLACEHOLDER;
  return Math.trunc(value).toLocaleString('en-US');
}

// Compact USD intent size: `<$1`, `$20`, `$1.2k`, `$3.4m`. Whole dollars under
// 1k (sizes that small don't need cents); k/m suffix above with one decimal.
// Each unit is rounded before the threshold check so a value just under the next
// boundary promotes (999,960 -> `$1m`) instead of rendering `$1000k`.
export function formatSize(value: number | null): string {
  if (!isUsableNumber(value) || value < 0) return PLACEHOLDER;
  if (value < 1) return '<$1';
  if (Math.round(value) < 1_000) return `$${Math.round(value)}`;
  const k = roundTenth(value / 1_000);
  if (k < 1_000) return `$${k}k`;
  return `$${roundTenth(value / 1_000_000)}m`;
}

// Round to one decimal; the numeric result drops a trailing `.0` on its own
// (so `1` renders `$1k`, `1.2` renders `$1.2k`).
function roundTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

// Compact span the sample covers: `0s`, `45s`, `8h`, `2.7d`. Round into each
// unit before the threshold check so a near-boundary value rolls over (3599s →
// `1h`, not `60m`) instead of rendering an out-of-range count. Days keep one
// decimal under 10d (2.7d reads better than 3d) and round above it (33d).
export function formatSampleWindow(value: number | null): string {
  if (!isUsableNumber(value) || value < 0) return PLACEHOLDER;
  const seconds = Math.round(value);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(value / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(value / 3600);
  if (hours < 24) return `${hours}h`;
  const days = value / 86_400;
  // Round to the displayed precision before the `< 10` check: 9.97d must read
  // `10d`, not `10.0d` (raw 9.97 passes `< 10` but `toFixed(1)` renders 10.0).
  const tenthDays = Math.round(days * 10) / 10;
  return tenthDays < 10 ? `${tenthDays.toFixed(1)}d` : `${Math.round(days)}d`;
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

// Fee as a percentage of the amount moved: `0.04%`. Anything that rounds to
// `0.00%` is a real, non-zero fee that's just below the displayed precision, so
// show `<0.01%` rather than implying it's free.
export function formatFeePercent(value: number | null): string {
  if (!isUsableNumber(value) || value < 0) return PLACEHOLDER;
  if (value > 0 && value < 0.005) return '<0.01%';
  return `${value.toFixed(2)}%`;
}
