import { describe, expect, it } from 'vitest';
import { parseBinaryForDisplay } from './demo-helpers';

describe('parseBinaryForDisplay', () => {
  it('parses a binary hex string into display components', () => {
    const binaryHex = '0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045';
    const result = parseBinaryForDisplay(binaryHex);

    expect(result.version).toBe('0001');
    expect(result.chainTypeHex).toBe('0001');
    expect(result.chainRefLength).toBe('00 (0b)');
    expect(result.chainRefHex).toBe('01');
    expect(result.addressLength).toBe('14 (20b)');
    expect(result.addressHex).toBe('d8da6bf26964af9d7eed9e03e53415d37aa96045');
  });
});
