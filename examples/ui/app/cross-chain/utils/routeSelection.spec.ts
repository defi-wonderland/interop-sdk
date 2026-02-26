import { describe, expect, it } from 'vitest';
import { createRouteSelector, type RouteConfig, type Selection } from './routeSelection';
import type { UITokenInfo } from '../types/assets';

const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const SHIB = '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE';
const UNKNOWN = '0x0000000000000000000000000000000000000001';

function token(symbol: string, providers: string[]): UITokenInfo {
  return { symbol, decimals: 18, providers };
}

const config: RouteConfig = {
  byChain: {
    1: [USDC, WETH, DAI, SHIB],
    10: [USDC, WETH, DAI, SHIB],
  },
  tokenInfo: {
    1: {
      [USDC]: token('USDC', ['across', 'sample']),
      [WETH]: token('WETH', ['across']),
      [DAI]: token('DAI', ['sample']),
      [SHIB]: token('SHIB', ['across']),
    },
    10: {
      [USDC]: token('USDC', ['across', 'sample']),
      [WETH]: token('WETH', ['across']),
      [DAI]: token('DAI', ['sample']),
      [SHIB]: token('SHIB', ['across']),
    },
  },
};

const VALID_TOKENS = [USDC, WETH, DAI];

function sel(overrides: Partial<Selection> = {}): Selection {
  return { inputChainId: 1, outputChainId: 10, inputToken: USDC, outputToken: USDC, ...overrides };
}

describe('selectionFromUrl', () => {
  const selector = createRouteSelector(config);

  it('uses URL chains when supported', () => {
    const result = selector.selectionFromUrl({ fromChain: 10, toChain: 1 }, 1, 10);
    expect(result.inputChainId).toBe(10);
    expect(result.outputChainId).toBe(1);
  });

  it('falls back to defaults for missing or unsupported chains', () => {
    expect(selector.selectionFromUrl({}, 1, 10).inputChainId).toBe(1);
    expect(selector.selectionFromUrl({ fromChain: 999 }, 1, 10).inputChainId).toBe(1);
    expect(selector.selectionFromUrl({ toChain: 888 }, 1, 10).outputChainId).toBe(10);
  });

  it('avoids same-chain by falling back when URL toChain equals inputChainId', () => {
    const result = selector.selectionFromUrl({ fromChain: 1, toChain: 1 }, 1, 10);
    expect(result.outputChainId).toBe(10);
  });

  it('matches URL token addresses case-insensitively', () => {
    const result = selector.selectionFromUrl({ fromToken: USDC.toLowerCase(), toToken: DAI.toUpperCase() }, 1, 10);
    expect(result.inputToken).toBe(USDC);
    expect(result.outputToken).toBe(DAI);
  });

  it('leaves tokens empty when missing or not on chain', () => {
    expect(selector.selectionFromUrl({}, 1, 10).inputToken).toBe('');
    expect(selector.selectionFromUrl({ fromToken: UNKNOWN }, 1, 10).inputToken).toBe('');
  });
});

describe('resolve', () => {
  const selector = createRouteSelector(config);

  it('preserves tokens that are already valid', () => {
    const resolved = selector.resolve(sel({ inputToken: USDC, outputToken: USDC }));
    expect(resolved.inputToken).toBe(USDC);
    expect(resolved.outputToken).toBe(USDC);
  });

  it('corrects stale tokens to first available', () => {
    const resolved = selector.resolve(sel({ inputToken: UNKNOWN, outputToken: UNKNOWN }));
    expect(resolved.inputToken).toBe(VALID_TOKENS[0]);
    expect(resolved.outputToken).not.toBe(UNKNOWN);
  });

  it('cascades: correcting input token changes output list', () => {
    // WETH is across-only → only same-symbol (WETH) is reachable on output chain
    const resolved = selector.resolve(sel({ inputToken: WETH, outputToken: DAI }));
    expect(resolved.outputToken).toBe(WETH);
    expect(resolved.outputTokens).toEqual([WETH]);
  });

  it('filters by across whitelist and provider compatibility', () => {
    const resolved = selector.resolve(sel({ inputToken: USDC }));
    expect(resolved.inputTokens).toEqual(VALID_TOKENS);
    expect(resolved.inputTokens).not.toContain(SHIB);
    // USDC (across + sample) can reach DAI (sample) via shared sample
    expect(resolved.outputTokens).toContain(DAI);
  });

  it('across-only input limits output to same-symbol', () => {
    const resolved = selector.resolve(sel({ inputToken: WETH }));
    expect(resolved.outputTokens).toContain(WETH);
    expect(resolved.outputTokens).not.toContain(USDC);
    expect(resolved.outputTokens).not.toContain(DAI);
  });
});

describe('cascading', () => {
  const selector = createRouteSelector(config);

  it('setInputChain preserves tokens when they exist on the new chain', () => {
    const next = selector.setInputChain(sel({ inputToken: USDC, outputToken: DAI }), 10);
    expect(next.inputChainId).toBe(10);
    expect(next.inputToken).toBe(USDC);
    expect(next.outputToken).toBe(DAI);
  });

  it('setInputChain falls back input token when it does not exist on new chain', () => {
    const onlyChain1 = '0x1111111111111111111111111111111111111111';
    const s = createRouteSelector({
      byChain: { 1: [onlyChain1, USDC], 10: [USDC, WETH] },
      tokenInfo: {
        1: { [onlyChain1]: token('UNI', ['sample']), [USDC]: token('USDC', ['across', 'sample']) },
        10: { [USDC]: token('USDC', ['across', 'sample']), [WETH]: token('WETH', ['across']) },
      },
    });
    const next = s.setInputChain({ inputChainId: 1, outputChainId: 10, inputToken: onlyChain1, outputToken: USDC }, 10);
    expect(next.inputToken).toBe(USDC);
  });

  it('setOutputChain leaves input unchanged and re-evaluates output', () => {
    const prev = sel({ inputChainId: 1, inputToken: USDC, outputToken: USDC });
    const next = selector.setOutputChain(prev, 10);
    expect(next.inputChainId).toBe(1);
    expect(next.inputToken).toBe(USDC);
    expect(next.outputToken).toBe(USDC);
  });

  it('setInputToken preserves output when still compatible', () => {
    const next = selector.setInputToken(sel({ inputToken: USDC, outputToken: USDC }), DAI);
    expect(next.inputToken).toBe(DAI);
    expect(next.outputToken).toBe(USDC);
  });

  it('setInputToken resets output when providers no longer overlap', () => {
    const next = selector.setInputToken(sel({ inputToken: DAI, outputToken: DAI }), WETH);
    expect(next.outputToken).toBe(WETH);
  });
});

describe('edge cases', () => {
  it('empty config or unknown chain yields empty results', () => {
    const empty = createRouteSelector({ byChain: {}, tokenInfo: {} }).resolve(sel());
    expect(empty.inputToken).toBe('');
    expect(empty.outputToken).toBe('');
    expect(empty.inputTokens).toEqual([]);

    const unknown = createRouteSelector(config).resolve(sel({ inputChainId: 999, outputChainId: 888 }));
    expect(unknown.inputTokens).toEqual([]);
    expect(unknown.outputTokens).toEqual([]);
  });

  it('token with no metadata stays visible in available tokens', () => {
    const s = createRouteSelector({
      byChain: { 1: [USDC, UNKNOWN], 10: [USDC] },
      tokenInfo: {
        1: { [USDC]: token('USDC', ['across', 'sample']) },
        10: { [USDC]: token('USDC', ['across', 'sample']) },
      },
    });
    expect(s.resolve(sel({ inputChainId: 1 })).inputTokens).toContain(UNKNOWN);
  });
});
