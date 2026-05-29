import { unstable_cache } from 'next/cache';
import { chainService, quotesService } from '.';
import type { QuoteBenchmarkResponse } from '~/lib/types';
import { buildQuoteRequest } from '~/components/race-table/raceRows';
import { AssetSymbol } from '~/lib/assets';
import { ChainId } from '~/lib/chains';

const CACHE_TTL_SECONDS = 30;
const CACHE_TAG = 'race-quotes';

export interface CachedRaceQuotesInput {
  fromChainId: ChainId;
  toChainId: ChainId;
  assetSymbol: AssetSymbol;
  amount: string;
}

export interface CachedRaceQuotesResult extends QuoteBenchmarkResponse {
  cachedAt: number;
}

/**
 * Module-level coalescing map. Two concurrent requests for the same key share
 * a single upstream call. Entries are cleared in `finally` regardless of outcome.
 */
const inflight = new Map<string, Promise<CachedRaceQuotesResult>>();

export function buildCacheKey(input: CachedRaceQuotesInput): string {
  return `${input.fromChainId}-${input.toChainId}-${input.assetSymbol}-${input.amount}`;
}

async function fetchQuotes(input: CachedRaceQuotesInput): Promise<CachedRaceQuotesResult> {
  const chains = await chainService.getChains();
  const request = buildQuoteRequest({ chains, ...input });
  const response = await quotesService.getQuotes(request);
  return { ...response, cachedAt: Date.now() };
}

const cachedFetch = unstable_cache(fetchQuotes, ['race-quotes'], {
  revalidate: CACHE_TTL_SECONDS,
  tags: [CACHE_TAG],
});

/**
 * Returns cached quotes for the given route, coalescing concurrent in-flight
 * calls for the same cache key. The wrapped `unstable_cache` is keyed by both
 * its `keyParts` and the serialized arguments, so distinct inputs get distinct
 * cache entries.
 */
export async function getCachedRaceQuotes(input: CachedRaceQuotesInput): Promise<CachedRaceQuotesResult> {
  const key = buildCacheKey(input);
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = cachedFetch(input).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}
