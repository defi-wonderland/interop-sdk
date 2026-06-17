import { describe, expect, it } from 'vitest';
import {
  formatFeePercent,
  formatFillCount,
  formatFillSeconds,
  formatSampleWindow,
  formatSize,
  formatSuccessRate,
} from '~/components/leaderboard/formatters';

describe('formatFillCount', () => {
  it('renders a placeholder for null or negative input', () => {
    expect(formatFillCount(null)).toBe('—');
    expect(formatFillCount(-1)).toBe('—');
  });

  it('groups thousands and truncates fractions', () => {
    expect(formatFillCount(0)).toBe('0');
    expect(formatFillCount(42)).toBe('42');
    expect(formatFillCount(1200)).toBe('1,200');
    expect(formatFillCount(1200.9)).toBe('1,200'); // truncated, not rounded
    expect(formatFillCount(1_000_000)).toBe('1,000,000');
  });
});

describe('formatSize', () => {
  it('renders a placeholder for null or negative input', () => {
    expect(formatSize(null)).toBe('—');
    expect(formatSize(-5)).toBe('—');
  });

  it('shows sub-dollar sizes as <$1 rather than $0', () => {
    expect(formatSize(0)).toBe('<$1');
    expect(formatSize(0.4)).toBe('<$1');
  });

  it('shows whole dollars under 1k', () => {
    expect(formatSize(1)).toBe('$1');
    expect(formatSize(20)).toBe('$20');
    expect(formatSize(156.7)).toBe('$157'); // rounded to whole dollars
    expect(formatSize(999)).toBe('$999');
  });

  it('uses a k suffix with one decimal in the thousands', () => {
    expect(formatSize(1000)).toBe('$1k'); // trailing .0 dropped
    expect(formatSize(1234)).toBe('$1.2k');
    expect(formatSize(1500)).toBe('$1.5k');
    expect(formatSize(20_640)).toBe('$20.6k');
  });

  it('uses an m suffix in the millions', () => {
    expect(formatSize(1_000_000)).toBe('$1m');
    expect(formatSize(3_400_000)).toBe('$3.4m');
  });

  it('promotes to m at the 1M boundary instead of rendering 1000k', () => {
    expect(formatSize(999_960)).toBe('$1m'); // not $1000k
  });
});

describe('formatSuccessRate', () => {
  it('renders a placeholder for null input', () => {
    expect(formatSuccessRate(null)).toBe('—');
  });

  it('renders a fraction as a one-decimal percentage', () => {
    expect(formatSuccessRate(0)).toBe('0.0%');
    expect(formatSuccessRate(0.998)).toBe('99.8%');
    expect(formatSuccessRate(1)).toBe('100.0%');
  });

  it('clamps upstream rounding noise into [0, 100]', () => {
    expect(formatSuccessRate(1.0001)).toBe('100.0%');
    expect(formatSuccessRate(-0.0001)).toBe('0.0%');
  });
});

describe('formatFillSeconds', () => {
  it('renders a placeholder for null or negative input', () => {
    expect(formatFillSeconds(null)).toBe('—');
    expect(formatFillSeconds(-1)).toBe('—');
  });

  it('shows sub-second times in milliseconds', () => {
    expect(formatFillSeconds(0.012)).toBe('12ms');
    expect(formatFillSeconds(0.5)).toBe('500ms');
  });

  it('shows one decimal for seconds under a minute', () => {
    expect(formatFillSeconds(3)).toBe('3.0s');
    expect(formatFillSeconds(12.54)).toBe('12.5s');
  });

  it('rolls a near-minute value into minutes instead of 60.0s', () => {
    expect(formatFillSeconds(59.96)).toBe('1m'); // not 60.0s
  });

  it('formats minutes with a seconds remainder, dropping a zero remainder', () => {
    expect(formatFillSeconds(60)).toBe('1m');
    expect(formatFillSeconds(65)).toBe('1m 5s');
    expect(formatFillSeconds(120)).toBe('2m');
    expect(formatFillSeconds(266)).toBe('4m 26s');
  });
});

describe('formatFeePercent', () => {
  it('renders a placeholder for null or negative input', () => {
    expect(formatFeePercent(null)).toBe('—');
    expect(formatFeePercent(-0.1)).toBe('—');
  });

  it('renders two decimals', () => {
    expect(formatFeePercent(0.06)).toBe('0.06%');
    expect(formatFeePercent(0.228)).toBe('0.23%');
    expect(formatFeePercent(1.5)).toBe('1.50%');
  });

  it('shows a real zero as 0.00%', () => {
    expect(formatFeePercent(0)).toBe('0.00%');
  });

  it('shows a non-zero fee below display precision as <0.01%, not 0.00%', () => {
    expect(formatFeePercent(0.002)).toBe('<0.01%');
    expect(formatFeePercent(0.0049)).toBe('<0.01%');
  });
});

describe('formatSampleWindow', () => {
  it('renders a placeholder for null or negative input', () => {
    expect(formatSampleWindow(null)).toBe('—');
    expect(formatSampleWindow(-5)).toBe('—');
  });

  it('reports a zero / sub-minute span in seconds, not a rounded-up minute', () => {
    expect(formatSampleWindow(0)).toBe('0s');
    expect(formatSampleWindow(45)).toBe('45s');
  });

  it('rolls a near-boundary value into the next unit instead of an out-of-range count', () => {
    expect(formatSampleWindow(3599)).toBe('1h'); // not 60m
    expect(formatSampleWindow(86_399)).toBe('1.0d'); // not 24h
    expect(formatSampleWindow(9.97 * 86_400)).toBe('10d'); // not 10.0d
  });

  it('formats whole units', () => {
    expect(formatSampleWindow(8 * 3600)).toBe('8h');
    expect(formatSampleWindow(2.7 * 86_400)).toBe('2.7d');
    expect(formatSampleWindow(9.94 * 86_400)).toBe('9.9d'); // one decimal under 10d
    expect(formatSampleWindow(33 * 86_400)).toBe('33d'); // no decimal past 10d
  });
});
