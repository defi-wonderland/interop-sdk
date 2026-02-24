import { useCallback, useMemo, useState } from 'react';
import { useTokenConfig } from './useNetworkConfig';
import type { UITokenInfo } from '../types/assets';

// TODO: Replace with dynamic lookup via Across /available-routes endpoint.
// See: https://docs.across.to/reference/api-reference
const ACROSS_WHITELISTED_SYMBOLS = new Set(['USDC', 'USDT', 'WETH', 'DAI', 'ETH']);

function isAcrossWhitelisted(token: UITokenInfo): boolean {
  return !token.providers.includes('across') || ACROSS_WHITELISTED_SYMBOLS.has(token.symbol);
}

/** All whitelisted tokens on a chain (for the input dropdown). */
function availableTokens(addresses: readonly string[], tokenInfo: Record<string, UITokenInfo>): string[] {
  return addresses.filter((addr) => {
    const meta = tokenInfo[addr];
    return !meta || isAcrossWhitelisted(meta);
  });
}

/** Tokens reachable from the selected input via a shared provider (for the output dropdown). */
function compatibleTokens(
  addresses: readonly string[],
  tokenInfo: Record<string, UITokenInfo>,
  providers: string[],
  inputSymbol: string | undefined,
): string[] {
  return addresses.filter((addr) => {
    const meta = tokenInfo[addr];
    if (!meta || !isAcrossWhitelisted(meta)) return false;

    const shared = meta.providers.filter((p) => providers.includes(p));
    if (shared.length === 0) return false;

    // Across can only bridge same-symbol (USDC→USDC), not swap (USDC→DAI)
    const onlyViaAcross = shared.length === 1 && shared[0] === 'across';
    return !(onlyViaAcross && meta.symbol !== inputSymbol);
  });
}

function pickFirst(tokens: string[], current: string): string {
  return tokens.includes(current) ? current : (tokens[0] ?? '');
}

/** Resolves the output token for the current output chain. Returns '' if no compatible tokens exist. */
function resolveOutputToken(
  currentOutputChainId: number,
  providers: string[],
  inputSymbol: string | undefined,
  currentOutputToken: string,
  byChain: Record<number, readonly string[]>,
  tokenInfo: Record<number, Record<string, UITokenInfo>>,
): string {
  const compatible = compatibleTokens(
    byChain[currentOutputChainId] || [],
    tokenInfo[currentOutputChainId] || {},
    providers,
    inputSymbol,
  );
  return pickFirst(compatible, currentOutputToken);
}

/**
 * Manages chain/token selection state with route-aware cascading.
 * When a chain or input token changes, output token is automatically
 * adjusted to remain valid for the route.
 */
export function useRouteSelection(defaultInputChainId: number, defaultOutputChainId: number) {
  const { SUPPORTED_TOKEN_BY_CHAIN_ID: byChain, TOKEN_INFO: tokenInfo } = useTokenConfig();

  const [selection, setSelection] = useState({
    inputChainId: defaultInputChainId,
    outputChainId: defaultOutputChainId,
    inputToken: '',
    outputToken: '',
  });

  // Filtered input tokens for the dropdown
  const inputTokens = useMemo(() => {
    const tokens = byChain[selection.inputChainId] || [];
    const info = tokenInfo[selection.inputChainId] || {};
    return availableTokens(tokens, info);
  }, [byChain, tokenInfo, selection.inputChainId]);

  // Resolve effective input token (handles initial load / discovery)
  const inputToken = pickFirst(inputTokens, selection.inputToken);

  // Filtered output tokens for the dropdown (depends on resolved input)
  const outputTokens = useMemo(() => {
    const meta = tokenInfo[selection.inputChainId]?.[inputToken];
    const providers = meta?.providers ?? [];
    const tokens = byChain[selection.outputChainId] || [];
    const info = tokenInfo[selection.outputChainId] || {};
    return compatibleTokens(tokens, info, providers, meta?.symbol);
  }, [byChain, tokenInfo, selection.inputChainId, inputToken, selection.outputChainId]);

  // Resolve effective output token
  const outputToken = pickFirst(outputTokens, selection.outputToken);

  const setInputChain = useCallback(
    (chainId: number) => {
      setSelection((prev) => {
        const newInput = pickFirst(availableTokens(byChain[chainId] || [], tokenInfo[chainId] || {}), prev.inputToken);
        const meta = tokenInfo[chainId]?.[newInput];
        const outputToken = resolveOutputToken(
          prev.outputChainId,
          meta?.providers ?? [],
          meta?.symbol,
          prev.outputToken,
          byChain,
          tokenInfo,
        );
        return { ...prev, inputChainId: chainId, inputToken: newInput, outputToken };
      });
    },
    [byChain, tokenInfo],
  );

  const setOutputChain = useCallback(
    (chainId: number) => {
      setSelection((prev) => {
        const meta = tokenInfo[prev.inputChainId]?.[prev.inputToken];
        const providers = meta?.providers ?? [];
        const tokens = byChain[chainId] || [];
        const info = tokenInfo[chainId] || {};
        const newOutput = pickFirst(compatibleTokens(tokens, info, providers, meta?.symbol), prev.outputToken);

        return { ...prev, outputChainId: chainId, outputToken: newOutput };
      });
    },
    [byChain, tokenInfo],
  );

  const setInputToken = useCallback(
    (address: string) => {
      setSelection((prev) => {
        const meta = tokenInfo[prev.inputChainId]?.[address];
        const outputToken = resolveOutputToken(
          prev.outputChainId,
          meta?.providers ?? [],
          meta?.symbol,
          prev.outputToken,
          byChain,
          tokenInfo,
        );
        return { ...prev, inputToken: address, outputToken };
      });
    },
    [byChain, tokenInfo],
  );

  const setOutputToken = useCallback((address: string) => {
    setSelection((prev) => ({ ...prev, outputToken: address }));
  }, []);

  return {
    inputChainId: selection.inputChainId,
    outputChainId: selection.outputChainId,
    inputToken,
    outputToken,
    inputTokens,
    outputTokens,
    setInputChain,
    setOutputChain,
    setInputToken,
    setOutputToken,
  };
}
