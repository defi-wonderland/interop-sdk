import { describe, expect, it } from 'vitest';
import { parseHumanReadableForDisplay } from './demo-helpers';

describe('parseHumanReadableForDisplay', () => {
  it('parses chain label with optional checksum', () => {
    expect(parseHumanReadableForDisplay('vitalik.eth@eth#4CA88C9C')).toEqual({
      name: 'vitalik.eth',
      chainReference: 'eth',
      checksum: '4CA88C9C',
    });

    expect(parseHumanReadableForDisplay('vitalik.eth@eth')).toEqual({
      name: 'vitalik.eth',
      chainReference: 'eth',
      checksum: '',
    });
  });

  it('parses namespace:reference format', () => {
    expect(parseHumanReadableForDisplay('alice.eth@eip155:1#ABCD1234')).toEqual({
      name: 'alice.eth',
      chainType: 'eip155',
      chainReference: '1',
      checksum: 'ABCD1234',
    });
  });
});
