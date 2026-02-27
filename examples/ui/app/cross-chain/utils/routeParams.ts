import { isAddress } from 'viem';
import { viemChainNameMap } from '../../utils/viem-chains';

const ROUTE_PARAMS = {
  fromChain: 'fromChain',
  toChain: 'toChain',
  fromToken: 'fromToken',
  toToken: 'toToken',
} as const;

export interface RouteParams {
  fromChain?: number;
  toChain?: number;
  fromToken?: string;
  toToken?: string;
}

function parseChainId(value: string | null): number | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return undefined;
  if (!(n in viemChainNameMap)) return undefined;
  return n;
}

function parseTokenAddress(value: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!isAddress(trimmed)) return undefined;
  return trimmed;
}

export function readRouteParams(): RouteParams {
  if (typeof window === 'undefined') return {};
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      fromChain: parseChainId(params.get(ROUTE_PARAMS.fromChain)),
      toChain: parseChainId(params.get(ROUTE_PARAMS.toChain)),
      fromToken: parseTokenAddress(params.get(ROUTE_PARAMS.fromToken)),
      toToken: parseTokenAddress(params.get(ROUTE_PARAMS.toToken)),
    };
  } catch {
    return {};
  }
}

export function findTokenCaseInsensitive(tokens: readonly string[], target: string): string | undefined {
  const lower = target.toLowerCase();
  return tokens.find((t) => t.toLowerCase() === lower);
}

export function syncRouteParams(
  inputChainId: number,
  outputChainId: number,
  inputToken: string,
  outputToken: string,
): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);

  url.searchParams.set(ROUTE_PARAMS.fromChain, String(inputChainId));
  if (inputToken) url.searchParams.set(ROUTE_PARAMS.fromToken, inputToken);
  else url.searchParams.delete(ROUTE_PARAMS.fromToken);

  url.searchParams.set(ROUTE_PARAMS.toChain, String(outputChainId));
  if (outputToken) url.searchParams.set(ROUTE_PARAMS.toToken, outputToken);
  else url.searchParams.delete(ROUTE_PARAMS.toToken);

  if (url.search !== window.location.search) {
    window.history.replaceState(null, '', url.toString());
  }
}
