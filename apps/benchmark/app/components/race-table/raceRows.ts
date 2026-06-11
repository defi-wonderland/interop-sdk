import { parseUnits } from 'viem';
import { RACE_PROVIDER_IDS } from './constants';
import type { AssetLookup, RaceRow, RowStatus } from './types';
import type { NetworkAssets, QuoteRequest } from '@wonderland/interop-cross-chain';
import type { ProviderQuoteError, ProviderQuoteResult } from '~/lib/types';
import { isWellFormedAmount } from '~/lib/amountInput';
import { AssetSymbol } from '~/lib/assets';
import { ChainId } from '~/lib/chains';
import { PROVIDERS, ProviderId } from '~/lib/providers';

export const USER_PLACEHOLDER = '0x000000000000000000000000000000000000dEaD';

interface BuildQuoteRequestInput {
  chains: NetworkAssets[];
  fromChainId: ChainId;
  toChainId: ChainId;
  assetSymbol: AssetSymbol;
  amount: string;
}

export function createRows(status: RowStatus, errorMessage?: string): RaceRow[] {
  return RACE_PROVIDER_IDS.map((providerId) => ({ provider: PROVIDERS[providerId], status, errorMessage }));
}

export function buildRowsFromQuotes(quotes: ProviderQuoteResult[], errors: ProviderQuoteError[] = []): RaceRow[] {
  const quoteByProvider = new Map(quotes.map((quote) => [normalizeProviderId(quote.providerId), quote]));
  const errorByProvider = new Map(
    errors
      .map((entry) => [normalizeProviderId(entry.providerId ?? ''), entry] as const)
      .filter(([providerId]) => providerId !== undefined),
  );

  return RACE_PROVIDER_IDS.map<RaceRow>((providerId) => {
    const quote = quoteByProvider.get(providerId);
    if (quote) return { provider: PROVIDERS[providerId], status: 'settled', quote };

    const providerError = errorByProvider.get(providerId);
    const errorMessage = providerError?.errorMessage ?? 'NO ROUTE';
    return { provider: PROVIDERS[providerId], status: 'errored', errorMessage };
  });
}

export function orderRaceRows(rows: RaceRow[]): RaceRow[] {
  return [...rows].sort((left, right) => {
    if (left.status === 'settled' && right.status !== 'settled') return -1;
    if (right.status === 'settled' && left.status !== 'settled') return 1;
    if (left.status === 'errored' && right.status !== 'errored') return 1;
    if (right.status === 'errored' && left.status !== 'errored') return -1;

    if (left.status === 'settled' && right.status === 'settled') {
      return compareByOutputDesc(left, right);
    }

    return providerIndex(left.provider.id) - providerIndex(right.provider.id);
  });
}

export function buildQuoteRequest({
  chains,
  fromChainId,
  toChainId,
  assetSymbol,
  amount,
}: BuildQuoteRequestInput): QuoteRequest {
  const inputAsset = findAsset(chains, fromChainId, assetSymbol);
  const outputAsset = findAsset(chains, toChainId, assetSymbol);

  if (!inputAsset || !outputAsset) {
    throw new Error('NO ROUTE');
  }

  return {
    user: USER_PLACEHOLDER,
    input: {
      chainId: fromChainId,
      assetAddress: inputAsset.address,
      amount: parseAmount(amount, inputAsset.decimals),
    },
    output: {
      chainId: toChainId,
      assetAddress: outputAsset.address,
      recipient: USER_PLACEHOLDER,
    },
    swapType: 'exact-input',
  };
}

export function findAsset(chains: NetworkAssets[], chainId: ChainId, symbol: AssetSymbol): AssetLookup | undefined {
  const network = chains.find((entry) => entry.chainId === chainId);
  const asset = network?.assets.find((entry) => entry.symbol.toUpperCase() === symbol);
  return asset ? { address: asset.address, decimals: asset.decimals } : undefined;
}

export function findBestProvider(rows: RaceRow[], metric: 'output' | 'latency'): ProviderId | undefined {
  const settled = rows.filter((row) => row.status === 'settled' && row.quote);
  const sorted = [...settled].sort((left, right) => {
    if (metric === 'output') {
      return compareByOutputDesc(left, right);
    }

    return valueOrInfinity(left.quote?.latencyMs) - valueOrInfinity(right.quote?.latencyMs);
  });

  return sorted[0]?.provider.id;
}

export function parseOptionalNumber(value: string | number | undefined): number {
  if (value === undefined) return 0;
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

// Output amounts are integer base units of the destination asset. The race
// always quotes the same output asset (USDC->USDC), so they compare directly,
// and BigInt keeps it exact for 18-decimal tokens. A missing amount sorts last.
// Ranking by the token received (not its USD value) is both the right measure
// and robust: providers that omit a USD price still compete on equal footing.
function outputBaseUnits(quote: ProviderQuoteResult | undefined): bigint {
  if (quote?.outputAmount === undefined) return 0n;
  try {
    return BigInt(quote.outputAmount);
  } catch {
    return 0n;
  }
}

// Descending by output received: the provider that returns the most wins.
function compareByOutputDesc(left: RaceRow, right: RaceRow): number {
  const a = outputBaseUnits(left.quote);
  const b = outputBaseUnits(right.quote);
  return a < b ? 1 : a > b ? -1 : 0;
}

function parseAmount(value: string, decimals: number): string {
  const trimmed = value.trim();
  if (!isWellFormedAmount(trimmed)) throw new Error('Enter a valid amount');
  return parseUnits(trimmed.replace(/,/g, ''), decimals).toString();
}

function normalizeProviderId(providerId: string): ProviderId | undefined {
  const normalized = providerId.toLowerCase();
  return RACE_PROVIDER_IDS.find((id) => id === normalized);
}

function providerIndex(providerId: ProviderId): number {
  return RACE_PROVIDER_IDS.findIndex((id) => id === providerId);
}

function valueOrInfinity(value: number | undefined): number {
  return value === undefined ? Number.POSITIVE_INFINITY : value;
}
