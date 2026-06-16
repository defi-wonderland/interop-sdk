import { describe, expect, it } from 'vitest';
import { buildTokenDecimals } from '~/lib/tokenDecimals';
import type { NetworkAssets } from '@wonderland/interop-cross-chain';

function network(chainId: number, assets: NetworkAssets['assets']): NetworkAssets {
  return { chainId, assets };
}

function asset(address: string, decimals: number, symbol = 'TKN'): NetworkAssets['assets'][number] {
  return { address, symbol, decimals };
}

describe('buildTokenDecimals', () => {
  it('maps every asset to a chainId:loweraddress key with its decimals', () => {
    const chains = [
      network(1, [asset('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 6, 'USDC')]),
      network(8453, [asset('0x4200000000000000000000000000000000000006', 18, 'WETH')]),
    ];

    expect(buildTokenDecimals(chains)).toEqual({
      '1:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 6,
      '8453:0x4200000000000000000000000000000000000006': 18,
    });
  });

  it('lowercases the checksummed address so it matches the across service key', () => {
    const chains = [network(1, [asset('0xAbCdEf0000000000000000000000000000000001', 9)])];

    expect(buildTokenDecimals(chains)).toEqual({
      '1:0xabcdef0000000000000000000000000000000001': 9,
    });
  });

  it('returns an empty map when there are no chains', () => {
    expect(buildTokenDecimals([])).toEqual({});
  });

  it('keeps the same address on different chains as separate keys', () => {
    const address = '0x0000000000000000000000000000000000000abc';
    const chains = [network(1, [asset(address, 6)]), network(10, [asset(address, 18)])];

    expect(buildTokenDecimals(chains)).toEqual({
      '1:0x0000000000000000000000000000000000000abc': 6,
      '10:0x0000000000000000000000000000000000000abc': 18,
    });
  });
});
