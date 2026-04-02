import { findTokenCaseInsensitive, type RouteParams } from './routeParams';
import type { SwapFormMode } from '../stores/crossChainStore';
import type { UITokenInfo } from '../types/assets';

/** Tokens shown in the demo app. Anything outside this list is hidden regardless of provider. */
const WHITELISTED_SYMBOLS = new Set(['ETH', 'WETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'cbBTC', 'mockUSDC']);

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
  mode: SwapFormMode;
  buildQuoteProviderId: string;
}

function isWhitelisted(token: UITokenInfo): boolean {
  return WHITELISTED_SYMBOLS.has(token.symbol);
}

/** Tokens on a chain that pass the whitelist. */
function availableTokens(addresses: readonly string[], tokenInfo: Record<string, UITokenInfo>): string[] {
  return addresses.filter((addr) => {
    const meta = tokenInfo[addr];
    if (!meta) return true; // Not yet discovered — keep visible until metadata loads
    return isWhitelisted(meta);
  });
}

/** Tokens on the output chain reachable from the input token via a shared bridge/swap provider. */
function compatibleTokens(
  addresses: readonly string[],
  tokenInfo: Record<string, UITokenInfo>,
  inputProviders: string[],
): string[] {
  return addresses.filter((addr) => {
    const meta = tokenInfo[addr];
    if (!meta || !isWhitelisted(meta)) return false;

    return meta.providers.some((p) => inputProviders.includes(p));
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
  const { byChain, tokenInfo, mode, buildQuoteProviderId } = config;

  /** In buildQuote mode, only show tokens supported by the selected provider. */
  function filterByProvider(tokens: string[], chainId: number): string[] {
    if (mode !== 'buildQuote') return tokens;
    const meta = tokenInfo[chainId] ?? {};
    return tokens.filter((addr) => meta[addr]?.providers.includes(buildQuoteProviderId));
  }

  function inputTokensFor(chainId: number): string[] {
    const addresses = byChain[chainId] ?? [];
    const meta = tokenInfo[chainId] ?? {};
    return filterByProvider(availableTokens(addresses, meta), chainId);
  }

  function outputTokensFor(inputChainId: number, inputToken: string, outputChainId: number): string[] {
    const inputMeta = tokenInfo[inputChainId]?.[inputToken];
    const addresses = byChain[outputChainId] ?? [];
    const meta = tokenInfo[outputChainId] ?? {};
    const tokens = compatibleTokens(addresses, meta, inputMeta?.providers ?? []);

    if (mode === 'buildQuote' && inputMeta?.symbol) {
      return filterByProvider(
        tokens.filter((addr) => meta[addr]?.symbol === inputMeta.symbol),
        outputChainId,
      );
    }

    return tokens;
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
