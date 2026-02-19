import { useCallback, useMemo, useState } from 'react';
import { useTokenConfig } from './useNetworkConfig';
import type { UITokenInfo } from '../types/assets';

// TODO: Replace with dynamic lookup via Across /available-routes endpoint.
// See: https://docs.across.to/reference/api-reference
const ACROSS_WHITELISTED_SYMBOLS = new Set(['USDC', 'USDT', 'WETH', 'DAI', 'ETH']);

function isAcrossWhitelisted(token: UITokenInfo): boolean {
  return !token.providers.includes('across') || ACROSS_WHITELISTED_SYMBOLS.has(token.symbol);
}

function filterTokens(
  allTokens: readonly string[],
  tokenInfo: Record<string, UITokenInfo>,
  requiredProviders?: string[],
  inputSymbol?: string,
): string[] {
  return allTokens.filter((a) => {
    const token = tokenInfo[a];
    if (!token) return !requiredProviders;
    if (requiredProviders && !token.providers.some((p) => requiredProviders.includes(p))) return false;
    if (!isAcrossWhitelisted(token)) return false;

    if (inputSymbol && requiredProviders) {
      const sharedProviders = token.providers.filter((p) => requiredProviders.includes(p));
      const onlyAcross = sharedProviders.length === 1 && sharedProviders[0] === 'across';
      if (onlyAcross && token.symbol !== inputSymbol) return false;
    }

    return true;
  });
}

function pickFirst(tokens: string[], current: string): string {
  return tokens.includes(current) ? current : (tokens[0] ?? '');
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
    return filterTokens(tokens, info);
  }, [byChain, tokenInfo, selection.inputChainId]);

  // Resolve effective input token (handles initial load / discovery)
  const inputToken = pickFirst(inputTokens, selection.inputToken);

  // Filtered output tokens for the dropdown (depends on resolved input)
  const outputTokens = useMemo(() => {
    const meta = tokenInfo[selection.inputChainId]?.[inputToken];
    const providers = meta?.providers ?? [];
    const tokens = byChain[selection.outputChainId] || [];
    const info = tokenInfo[selection.outputChainId] || {};
    return filterTokens(tokens, info, providers, meta?.symbol);
  }, [byChain, tokenInfo, selection.inputChainId, inputToken, selection.outputChainId]);

  // Resolve effective output token
  const outputToken = pickFirst(outputTokens, selection.outputToken);

  const setInputChain = useCallback(
    (chainId: number) => {
      setSelection((prev) => {
        const tokens = byChain[chainId] || [];
        const info = tokenInfo[chainId] || {};
        const newInput = pickFirst(filterTokens(tokens, info), prev.inputToken);

        const meta = tokenInfo[chainId]?.[newInput];
        const providers = meta?.providers ?? [];
        const outTokens = byChain[prev.outputChainId] || [];
        const outInfo = tokenInfo[prev.outputChainId] || {};
        const newOutput = pickFirst(filterTokens(outTokens, outInfo, providers, meta?.symbol), prev.outputToken);

        return { ...prev, inputChainId: chainId, inputToken: newInput, outputToken: newOutput };
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
        const newOutput = pickFirst(filterTokens(tokens, info, providers, meta?.symbol), prev.outputToken);

        return { ...prev, outputChainId: chainId, outputToken: newOutput };
      });
    },
    [byChain, tokenInfo],
  );

  const setInputToken = useCallback(
    (address: string) => {
      setSelection((prev) => {
        const meta = tokenInfo[prev.inputChainId]?.[address];
        const providers = meta?.providers ?? [];
        const tokens = byChain[prev.outputChainId] || [];
        const info = tokenInfo[prev.outputChainId] || {};
        const newOutput = pickFirst(filterTokens(tokens, info, providers, meta?.symbol), prev.outputToken);

        return { ...prev, inputToken: address, outputToken: newOutput };
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
