import { unstable_cache } from 'next/cache';
import { chainService, quotesService } from '.';
import type { NetworkAssets } from '@wonderland/interop-cross-chain';
import type { QuoteBenchmarkResponse } from '~/lib/types';
import { buildQuoteRequest } from '~/components/race-table/raceRows';
import { AssetSymbol } from '~/lib/assets';
import { ChainId } from '~/lib/chains';
import { withTimeout } from '~/lib/helpers';

const CACHE_TTL_SECONDS = 30;
const CACHE_TAG = 'race-quotes';
const UPSTREAM_TIMEOUT_MS = 25_000;

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
  return `${input.fromChainId}-${input.toChainId}-${input.assetSymbol}-${input.amount.trim()}`;
}

/**
 * Per-process chain cache. The server component that renders the dropdowns
 * already calls `chainService.getChains()` to build `initialChains`; on a
 * cache miss inside this module we'd hit it a second time. Either path
 * populates the same slot, so whichever runs first warms the other.
 */
let chainsCache: Promise<NetworkAssets[]> | null = null;

function getChainsOnce(): Promise<NetworkAssets[]> {
  if (!chainsCache) {
    chainsCache = chainService.getChains().catch((error) => {
      chainsCache = null;
      throw error;
    });
  }
  return chainsCache;
}

async function fetchQuotes(input: CachedRaceQuotesInput): Promise<CachedRaceQuotesResult> {
  const chains = await getChainsOnce();
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
 *
 * Pass `chains` when the caller already has the chain list (e.g. a server
 * component that just rendered the dropdowns) to seed the shared chain cache
 * and skip a second discovery on cache miss. The chains are deliberately not
 * part of the cache key — quote responses don't depend on object identity.
 */
export async function getCachedRaceQuotes(
  input: CachedRaceQuotesInput,
  chains?: NetworkAssets[],
): Promise<CachedRaceQuotesResult> {
  if (chains && !chainsCache) {
    chainsCache = Promise.resolve(chains);
  }

  // Keep raw amount in the cache key so invalid inputs (e.g. `1,23`) fail
  // downstream in `parseAmount` instead of being silently coerced.
  const trimmed = { ...input, amount: input.amount.trim() };
  const key = buildCacheKey(trimmed);
  const existing = inflight.get(key);
  if (existing) return existing;

  // Bound the upstream call so a hung fetch can't keep the inflight entry
  // alive and starve every concurrent caller behind the same key.
  const promise = withTimeout(cachedFetch(trimmed), UPSTREAM_TIMEOUT_MS, 'CACHED_QUOTES_TIMEOUT').finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}
