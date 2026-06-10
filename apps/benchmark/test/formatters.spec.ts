import { describe, expect, it } from 'vitest';
import { formatSampleWindow } from '~/components/leaderboard/formatters';

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
  });

  it('formats whole units', () => {
    expect(formatSampleWindow(8 * 3600)).toBe('8h');
    expect(formatSampleWindow(2.7 * 86_400)).toBe('2.7d');
    expect(formatSampleWindow(33 * 86_400)).toBe('33d'); // no decimal past 10d
  });
});
