import { useCallback, useEffect, useMemo, useState } from 'react';
import { readRouteParams, syncRouteParams } from '../utils/routeParams';
import { createRouteSelector } from '../utils/routeSelection';
import { useTokenConfig } from './useNetworkConfig';

/**
 * Manages chain/token selection state with route-aware cascading.
 * When a chain or input token changes, output token is automatically
 * adjusted to remain valid for the route.
 */
export function useRouteSelection(defaultInputChainId: number, defaultOutputChainId: number) {
  const { SUPPORTED_TOKEN_BY_CHAIN_ID: byChain, TOKEN_INFO: tokenInfo } = useTokenConfig();

  const selector = useMemo(() => createRouteSelector({ byChain, tokenInfo }), [byChain, tokenInfo]);

  const [selection, setSelection] = useState(() => {
    const urlParams = readRouteParams();
    return selector.selectionFromUrl(urlParams, defaultInputChainId, defaultOutputChainId);
  });

  const resolved = useMemo(() => selector.resolve(selection), [selector, selection]);

  const setInputChain = useCallback(
    (chainId: number) => setSelection((prev) => selector.setInputChain(prev, chainId)),
    [selector],
  );

  const setOutputChain = useCallback(
    (chainId: number) => setSelection((prev) => selector.setOutputChain(prev, chainId)),
    [selector],
  );

  const setInputToken = useCallback(
    (address: string) => setSelection((prev) => selector.setInputToken(prev, address)),
    [selector],
  );

  const setOutputToken = useCallback((address: string) => {
    setSelection((prev) => ({ ...prev, outputToken: address }));
  }, []);

  useEffect(() => {
    const configLoaded = Object.keys(byChain).length > 0;
    if (!configLoaded) return;
    syncRouteParams(resolved.inputChainId, resolved.outputChainId, resolved.inputToken, resolved.outputToken);
  }, [byChain, resolved.inputChainId, resolved.outputChainId, resolved.inputToken, resolved.outputToken]);

  return {
    inputChainId: resolved.inputChainId,
    outputChainId: resolved.outputChainId,
    inputToken: resolved.inputToken,
    outputToken: resolved.outputToken,
    inputTokens: resolved.inputTokens,
    outputTokens: resolved.outputTokens,
    setInputChain,
    setOutputChain,
    setInputToken,
    setOutputToken,
  };
}
