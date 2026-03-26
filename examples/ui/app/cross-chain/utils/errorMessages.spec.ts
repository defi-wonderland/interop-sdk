import { describe, expect, it } from 'vitest';
import { parseError } from './errorMessages';

describe('parseError - SDK validation errors', () => {
  it('maps InsufficientFee to user-friendly message', () => {
    const err = {
      name: 'InsufficientFee',
      message: 'output.amount (1000000) must be less than input.amount (1000000)',
    };
    const result = parseError(err);
    expect(result.title).toBe('No Fee Margin');
    expect(result.message).toContain('less than input');
  });

  it('maps ZeroAmount to user-friendly message', () => {
    const err = { name: 'ZeroAmount', message: 'input.amount must be greater than zero' };
    const result = parseError(err);
    expect(result.title).toBe('Invalid Amount');
    expect(result.message).toContain('zero');
  });

  it('maps InvalidDeadline (past) to user-friendly message', () => {
    const err = { name: 'InvalidDeadline', message: 'fillDeadline (1700000000) is in the past (now: 1700000100)' };
    const result = parseError(err);
    expect(result.title).toBe('Invalid Deadline');
  });

  it('maps InvalidDeadline (too soon) to user-friendly message', () => {
    const err = { name: 'InvalidDeadline', message: 'fillDeadline is too soon: 30s from now, minimum is 60s' };
    const result = parseError(err);
    expect(result.title).toBe('Invalid Deadline');
  });
});
