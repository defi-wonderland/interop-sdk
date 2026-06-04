import { unstable_cache } from 'next/cache';
import { NextResponse } from 'next/server';
import { CHAIN_IDS, type ChainId } from '~/lib/chains';
import { withTimeout } from '~/lib/helpers';
import { fetchProviderMetrics } from '~/lib/services/providerMetrics';

const FETCH_TIMEOUT_MS = 15_000;
const CACHE_TTL_SECONDS = 60;

// Per (origin, destination) cached function. `unstable_cache` keys on the args
// so identical pairs share the cached response across the fleet for one
// minute. A route-handler-level `export const revalidate` is ignored when the
// handler reads `searchParams` (Next treats it as dynamic), so we cache at
// this layer instead.
const cachedFetch = unstable_cache(
  (fromChainId: ChainId, toChainId: ChainId) =>
    fetchProviderMetrics({
      originChainId: fromChainId,
      destinationChainId: toChainId,
    }),
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

  try {
    const metrics = await withTimeout(
      cachedFetch(fromChainId, toChainId),
      FETCH_TIMEOUT_MS,
      'HEAD_TO_HEAD_API_TIMEOUT',
    );
    return NextResponse.json({ metrics });
  } catch {
    return NextResponse.json({ error: 'upstream fetch failed' }, { status: 502 });
  }
}
