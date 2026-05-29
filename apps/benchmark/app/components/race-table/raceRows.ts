import { RACE_PROVIDER_IDS } from './constants';
import type { RaceRow, RowStatus } from './types';
import type { ProviderQuoteResult } from '~/lib/types';
import { PROVIDERS, ProviderId } from '~/lib/providers';

export function createRows(status: RowStatus, errorMessage?: string): RaceRow[] {
  return RACE_PROVIDER_IDS.map((providerId) => ({ provider: PROVIDERS[providerId], status, errorMessage }));
}

export function buildRowsFromQuotes(quotes: ProviderQuoteResult[]): RaceRow[] {
  const quoteByProvider = new Map(quotes.map((quote) => [normalizeProviderId(quote.providerId), quote]));

  return RACE_PROVIDER_IDS.map<RaceRow>((providerId) => {
    const quote = quoteByProvider.get(providerId);
    if (quote) return { provider: PROVIDERS[providerId], status: 'settled', quote };

    return { provider: PROVIDERS[providerId], status: 'errored', errorMessage: 'NO ROUTE' };
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
