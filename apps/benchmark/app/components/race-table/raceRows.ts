import { parseUnits } from 'viem';
import { RACE_PROVIDER_IDS } from './constants';
import type { AssetLookup, RaceRow, RowStatus } from './types';
import type { NetworkAssets, QuoteRequest } from '@wonderland/interop-cross-chain';
import type { ProviderQuoteError, ProviderQuoteResult } from '~/lib/types';
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
      return parseOptionalNumber(right.quote?.outputAmountUsd) - parseOptionalNumber(left.quote?.outputAmountUsd);
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
      return parseOptionalNumber(right.quote?.outputAmountUsd) - parseOptionalNumber(left.quote?.outputAmountUsd);
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

function parseAmount(value: string, decimals: number): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('Enter a valid amount');

  if (trimmed.includes(',') && !hasValidThousandSeparators(trimmed)) {
    throw new Error('Enter a valid amount');
  }

  const normalized = trimmed.replace(/,/g, '');
  if (Number.isNaN(Number(normalized))) {
    throw new Error('Enter a valid amount');
  }

  return parseUnits(normalized, decimals).toString();
}

function hasValidThousandSeparators(value: string): boolean {
  const [integerPart, ...rest] = value.split('.');
  if (rest.length > 1) return false;
  if (!integerPart || integerPart.includes(',,')) return false;

  const digitsOnly = integerPart.replace(/,/g, '');
  if (!/^\d+$/.test(digitsOnly)) return false;

  const reformatted = digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return reformatted === integerPart;
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
