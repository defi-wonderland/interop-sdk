import { unstable_cache } from 'next/cache';
import { NextResponse } from 'next/server';
import { CHAIN_IDS, type ChainId } from '~/lib/chains';
import { withTimeout } from '~/lib/helpers';
import { chainService } from '~/lib/services';
import { allProvidersFailed, fetchProviderMetrics } from '~/lib/services/providerMetrics';
import { buildTokenDecimals } from '~/lib/tokenDecimals';

const FETCH_TIMEOUT_MS = 15_000;
const CHAINS_TIMEOUT_MS = 5_000;
const CACHE_TTL_SECONDS = 60;

// Token decimals are the same for every route pair and rarely change, so cache
// them once (shared across pairs) instead of refetching inside each pair's
// cache. Only successful results are cached: this throws on failure so a
// transient discovery error isn't cached as an empty map for the whole TTL
// (which would globally degrade Across USD). The caller handles the throw.
const getTokenDecimals = unstable_cache(
  async (): Promise<Record<string, number>> => {
    const chains = await withTimeout(chainService.getChains(), CHAINS_TIMEOUT_MS, 'H2H_CHAINS_TIMEOUT');
    return buildTokenDecimals(chains);
  },
  ['head-to-head-token-decimals'],
  { revalidate: CACHE_TTL_SECONDS },
);

// Per (origin, destination, decimals) cached function. `unstable_cache` keys on
// the args so identical pairs share the cached response across the fleet for one
// minute. `tokenDecimals` is part of the key on purpose: a degraded ({}) and a
// full map cache as separate entries, so a transient decimals failure can't pin
// degraded Across USD onto the pair's good entry. A route-handler-level
// `export const revalidate` is ignored when the handler reads `searchParams`
// (Next treats it as dynamic), so we cache at this layer instead.
const cachedFetch = unstable_cache(
  async (fromChainId: ChainId, toChainId: ChainId, tokenDecimals: Record<string, number>) => {
    const metrics = await fetchProviderMetrics({
      originChainId: fromChainId,
      destinationChainId: toChainId,
      tokenDecimals,
    });
    // `fetchProviderMetrics` resolves with null-filled rows when providers
    // fail, so a transient total outage would otherwise be cached for the
    // full TTL. Throw instead: the 502 path below is never cached and the
    // next request retries. Same intent as the `noStore()` guards in page.tsx.
    if (allProvidersFailed(metrics)) throw new Error('every provider fetch failed');
    return metrics;
  },
  ['head-to-head-metrics'],
  { revalidate: CACHE_TTL_SECONDS },
);

function parseChainId(raw: string | null): ChainId | null {
  if (raw === null) return null;
  const num = Number(raw);
  if (!Number.isInteger(num)) return null;
  return CHAIN_IDS.find((id) => id === num) ?? null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fromChainId = parseChainId(searchParams.get('from'));
  const toChainId = parseChainId(searchParams.get('to'));

  if (fromChainId === null || toChainId === null) {
    return NextResponse.json({ error: 'invalid chain id' }, { status: 400 });
  }
  if (fromChainId === toChainId) {
    return NextResponse.json({ error: 'origin and destination must differ' }, { status: 400 });
  }

  // Decimals only enhance Across USD amounts, so a discovery failure degrades to
  // no decimals (Across amountUsd stays null) instead of failing the request.
  // Resolved outside cachedFetch so the (possibly empty) map is part of its cache
  // key, keeping degraded and full results in separate entries.
  let tokenDecimals: Record<string, number> = {};
  try {
    tokenDecimals = await getTokenDecimals();
  } catch (error) {
    console.warn('head-to-head-metrics: token decimals unavailable, Across USD degraded:', error);
  }

  try {
    const metrics = await withTimeout(
      cachedFetch(fromChainId, toChainId, tokenDecimals),
      FETCH_TIMEOUT_MS,
      'HEAD_TO_HEAD_API_TIMEOUT',
    );
    return NextResponse.json({ metrics });
  } catch (error) {
    // Surface the cause server-side so timeouts, upstream 5xx, and parse
    // failures are distinguishable in logs. The client payload stays generic.
    console.error(`head-to-head-metrics ${fromChainId}->${toChainId} failed:`, error);
    return NextResponse.json({ error: 'upstream fetch failed' }, { status: 502 });
  }
}
