import { describe, expect, it } from 'vitest';
import { isValidAmount, sanitizeAmountInput, formatFee, exceedsDemoLimit } from './amountValidation';

describe('sanitizeAmountInput', () => {
  it('allows digits and dot', () => {
    expect(sanitizeAmountInput('123.45', '')).toBe('123.45');
  });

  it('converts comma to dot', () => {
    expect(sanitizeAmountInput('10,5', '')).toBe('10.5');
  });

  it('strips invalid characters', () => {
    expect(sanitizeAmountInput('-$10abc', '')).toBe('10');
  });

  it('prevents multiple dots', () => {
    expect(sanitizeAmountInput('10.5.5', '10.5')).toBe('10.5');
  });

  it('handles leading dot', () => {
    expect(sanitizeAmountInput('.5', '')).toBe('0.5');
  });
});

describe('isValidAmount', () => {
  it('returns true for valid numbers', () => {
    expect(isValidAmount('10')).toBe(true);
    expect(isValidAmount('10.5')).toBe(true);
    expect(isValidAmount('0')).toBe(true);
  });

  it('returns false for invalid input', () => {
    expect(isValidAmount('')).toBe(false);
    expect(isValidAmount('abc')).toBe(false);
    expect(isValidAmount('-10')).toBe(false);
    expect(isValidAmount('1e10')).toBe(false);
  });
});

describe('formatFee', () => {
  it('returns fee string when output < input', () => {
    expect(formatFee('0.5', '0.4')).toBe('Fee: 0.1000 (20.00%)');
    expect(formatFee('100', '99')).toBe('Fee: 1.0000 (1.00%)');
    expect(formatFee('1', '0.999')).toBe('Fee: 0.0010 (0.10%)');
  });

  it('returns null when output equals input', () => {
    expect(formatFee('0.5', '0.5')).toBeNull();
  });

  it('returns null when output exceeds input', () => {
    expect(formatFee('0.5', '0.6')).toBeNull();
  });

  it('returns null for zero input', () => {
    expect(formatFee('0', '0')).toBeNull();
  });

  it('returns null for invalid values', () => {
    expect(formatFee('abc', '0.5')).toBeNull();
    expect(formatFee('0.5', 'xyz')).toBeNull();
  });
});

describe('exceedsDemoLimit', () => {
  it('returns true when amount exceeds max for stablecoins', () => {
    expect(exceedsDemoLimit('101', 'USDC')).toBe(true);
    expect(exceedsDemoLimit('101', 'USDT')).toBe(true);
    expect(exceedsDemoLimit('101', 'DAI')).toBe(true);
  });

  it('returns true when amount exceeds max for ETH', () => {
    expect(exceedsDemoLimit('0.04', 'ETH')).toBe(true);
    expect(exceedsDemoLimit('0.04', 'WETH')).toBe(true);
  });

  it('returns true when amount exceeds max for BTC', () => {
    expect(exceedsDemoLimit('0.002', 'BTC')).toBe(true);
    expect(exceedsDemoLimit('0.002', 'WBTC')).toBe(true);
  });

  it('returns false when amount is at or below limit', () => {
    expect(exceedsDemoLimit('100', 'USDC')).toBe(false);
    expect(exceedsDemoLimit('50', 'USDT')).toBe(false);
    expect(exceedsDemoLimit('0.03', 'ETH')).toBe(false);
    expect(exceedsDemoLimit('0.001', 'WBTC')).toBe(false);
  });

  it('returns false for tokens not in the limit map', () => {
    expect(exceedsDemoLimit('999999', 'SHIB')).toBe(false);
  });

  it('returns false when symbol is undefined or empty', () => {
    expect(exceedsDemoLimit('999999', undefined)).toBe(false);
    expect(exceedsDemoLimit('999999', '')).toBe(false);
    expect(exceedsDemoLimit('999999', '   ')).toBe(false);
  });

  it('returns false for invalid amounts', () => {
    expect(exceedsDemoLimit('', 'USDC')).toBe(false);
    expect(exceedsDemoLimit('abc', 'ETH')).toBe(false);
  });

  it('is case-insensitive on symbol', () => {
    expect(exceedsDemoLimit('101', 'usdc')).toBe(true);
    expect(exceedsDemoLimit('101', 'Usdc')).toBe(true);
  });

  it('handles comma-separated amounts', () => {
    expect(exceedsDemoLimit('100,5', 'USDC')).toBe(true);
    expect(exceedsDemoLimit('99,5', 'USDC')).toBe(false);
  });
});
