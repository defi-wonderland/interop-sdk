import { findTokenCaseInsensitive, type RouteParams } from './routeParams';
import type { UITokenInfo } from '../types/assets';

// TODO: Replace with dynamic lookup via Across /available-routes endpoint.
// See: https://docs.across.to/reference/api-reference
const ACROSS_WHITELISTED_SYMBOLS = new Set(['USDC', 'USDT', 'WETH', 'DAI', 'ETH']);

export interface Selection {
  inputChainId: number;
  outputChainId: number;
  inputToken: string;
  outputToken: string;
}

export interface ResolvedSelection extends Selection {
  inputTokens: string[];
  outputTokens: string[];
}

export type TokensByChain = Record<number, readonly string[]>;
export type TokenInfoByChain = Record<number, Record<string, UITokenInfo>>;

export interface RouteConfig {
  byChain: TokensByChain;
  tokenInfo: TokenInfoByChain;
}

function passesAcrossFilter(token: UITokenInfo): boolean {
  const isAcrossToken = token.providers.includes('across');
  if (!isAcrossToken) return true;
  return ACROSS_WHITELISTED_SYMBOLS.has(token.symbol);
}

/** Tokens on a chain that pass the Across whitelist filter. */
function availableTokens(addresses: readonly string[], tokenInfo: Record<string, UITokenInfo>): string[] {
  return addresses.filter((addr) => {
    const meta = tokenInfo[addr];
    if (!meta) return true; // Not yet discovered — keep visible until metadata loads
    return passesAcrossFilter(meta);
  });
}

/** Tokens on the output chain reachable from the input token via a shared bridge/swap provider. */
function compatibleTokens(
  addresses: readonly string[],
  tokenInfo: Record<string, UITokenInfo>,
  inputProviders: string[],
  inputSymbol: string | undefined,
): string[] {
  return addresses.filter((addr) => {
    const meta = tokenInfo[addr];
    if (!meta || !passesAcrossFilter(meta)) return false;

    const sharedProviders = meta.providers.filter((p) => inputProviders.includes(p));
    if (sharedProviders.length === 0) return false;

    // Across can only bridge same-symbol (USDC->USDC), not cross-symbol (USDC->DAI)
    const onlyViaAcross = sharedProviders.length === 1 && sharedProviders[0] === 'across';
    const isDifferentSymbol = meta.symbol !== inputSymbol;
    if (onlyViaAcross && isDifferentSymbol) return false;

    return true;
  });
}

function pickFirst(tokens: string[], current: string): string {
  return tokens.includes(current) ? current : (tokens[0] ?? '');
}

function resolveInitialOutputChain(
  url: RouteParams,
  byChain: TokensByChain,
  inputChainId: number,
  defaultInputChainId: number,
  defaultOutputChainId: number,
): number {
  const urlChainIsSupported = url.toChain != null && byChain[url.toChain] != null;
  const urlChainDiffersFromInput = url.toChain !== inputChainId;
  if (urlChainIsSupported && urlChainDiffersFromInput) {
    return url.toChain!;
  }
  if (defaultOutputChainId !== inputChainId) {
    return defaultOutputChainId;
  }
  return defaultInputChainId;
}

export function createRouteSelector(config: RouteConfig) {
  const { byChain, tokenInfo } = config;

  function inputTokensFor(chainId: number): string[] {
    const addresses = byChain[chainId] ?? [];
    const meta = tokenInfo[chainId] ?? {};
    return availableTokens(addresses, meta);
  }

  function outputTokensFor(inputChainId: number, inputToken: string, outputChainId: number): string[] {
    const inputMeta = tokenInfo[inputChainId]?.[inputToken];
    const addresses = byChain[outputChainId] ?? [];
    const meta = tokenInfo[outputChainId] ?? {};
    return compatibleTokens(addresses, meta, inputMeta?.providers ?? [], inputMeta?.symbol);
  }

  function bestOutputToken(
    inputChainId: number,
    inputToken: string,
    outputChainId: number,
    currentOutputToken: string,
  ): string {
    const candidates = outputTokensFor(inputChainId, inputToken, outputChainId);
    return pickFirst(candidates, currentOutputToken);
  }

  function selectionFromUrl(url: RouteParams, defaultInputChainId: number, defaultOutputChainId: number): Selection {
    const urlInputChainIsSupported = url.fromChain != null && byChain[url.fromChain] != null;
    const inputChainId = urlInputChainIsSupported ? url.fromChain! : defaultInputChainId;

    const outputChainId = resolveInitialOutputChain(
      url,
      byChain,
      inputChainId,
      defaultInputChainId,
      defaultOutputChainId,
    );

    const inputChainTokens = byChain[inputChainId] ?? [];
    const outputChainTokens = byChain[outputChainId] ?? [];

    const inputToken = url.fromToken ? (findTokenCaseInsensitive(inputChainTokens, url.fromToken) ?? '') : '';
    const outputToken = url.toToken ? (findTokenCaseInsensitive(outputChainTokens, url.toToken) ?? '') : '';

    return { inputChainId, outputChainId, inputToken, outputToken };
  }

  function resolve(selection: Selection): ResolvedSelection {
    const inputTokens = inputTokensFor(selection.inputChainId);
    const inputToken = pickFirst(inputTokens, selection.inputToken);

    const outputTokens = outputTokensFor(selection.inputChainId, inputToken, selection.outputChainId);
    const outputToken = pickFirst(outputTokens, selection.outputToken);

    return {
      inputChainId: selection.inputChainId,
      outputChainId: selection.outputChainId,
      inputToken,
      outputToken,
      inputTokens,
      outputTokens,
    };
  }

  function setInputChain(prev: Selection, chainId: number): Selection {
    const inputToken = pickFirst(inputTokensFor(chainId), prev.inputToken);
    const outputToken = bestOutputToken(chainId, inputToken, prev.outputChainId, prev.outputToken);
    return { ...prev, inputChainId: chainId, inputToken, outputToken };
  }

  function setOutputChain(prev: Selection, chainId: number): Selection {
    const outputToken = bestOutputToken(prev.inputChainId, prev.inputToken, chainId, prev.outputToken);
    return { ...prev, outputChainId: chainId, outputToken };
  }

  function setInputToken(prev: Selection, address: string): Selection {
    const outputToken = bestOutputToken(prev.inputChainId, address, prev.outputChainId, prev.outputToken);
    return { ...prev, inputToken: address, outputToken };
  }

  return { selectionFromUrl, resolve, setInputChain, setOutputChain, setInputToken };
}
