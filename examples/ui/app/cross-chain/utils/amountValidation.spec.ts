import { describe, expect, it } from 'vitest';
import { isValidAmount, sanitizeAmountInput } from './amountValidation';

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
