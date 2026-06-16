import { unstable_noStore as noStore } from 'next/cache';
import { Footer } from './components/Footer';
import { Label } from './components/Label';
import { RaceTable } from './components/RaceTable';
import { RequestBar } from './components/RequestBar';
import { SectionFrame } from './components/SectionFrame';
import { SectionHeader } from './components/SectionHeader';
import { TopNav } from './components/TopNav';
import { HeadToHeadClient } from './components/headtohead/HeadToHeadClient';
import { RouteSelector } from './components/headtohead/RouteSelector';
import { Leaderboard } from './components/leaderboard/Leaderboard';
import { buildQuoteRequest, buildRowsFromQuotes, createRows, orderRaceRows } from './components/race-table/raceRows';
import { CHAIN_IDS } from './lib/chains';
import { withTimeout } from './lib/helpers';
import {
  INITIAL_AMOUNT,
  INITIAL_ASSET_SYMBOL,
  INITIAL_FROM_CHAIN_ID,
  INITIAL_TO_CHAIN_ID,
} from './lib/requestBarDefaults';
import { chainService, quotesService } from './lib/services';
import {
  allProvidersFailed,
  emptyProviderMetrics,
  fetchAggregatedProviderMetrics,
  fetchProviderMetrics,
} from './lib/services/providerMetrics';
import { buildTokenDecimals } from './lib/tokenDecimals';
import type { RaceRow } from './components/race-table/types';
import type { HistoryQuery, ProviderMetrics } from './lib/types/historyMetrics';
import type { NetworkAssets } from '@wonderland/interop-cross-chain';

export const revalidate = 3600;

const META_LABEL_CLASS = 'font-mono text-label text-text-muted';
const PACKAGE_URL = 'https://www.npmjs.com/package/@wonderland/interop-cross-chain';
const INITIAL_RACE_TIMEOUT_MS = 20_000;
const HEAD_TO_HEAD_SEED_TIMEOUT_MS = 15_000;

// Every directed route between the supported chains. The leaderboard pools all
// of them for a network-wide view; head-to-head stays on a single route.
const NETWORK_ROUTES: HistoryQuery[] = CHAIN_IDS.flatMap((originChainId) =>
  CHAIN_IDS.filter((destinationChainId) => destinationChainId !== originChainId).map((destinationChainId) => ({
    originChainId,
    destinationChainId,
  })),
);

export default async function Home() {
  const initialChains = await loadInitialChains();
  const [initialRows, leaderboardMetrics, headToHeadSeed] = await Promise.all([
    loadInitialRace(initialChains),
    loadLeaderboardMetrics(initialChains),
    loadHeadToHeadSeed(initialChains),
  ]);

  // First paint uses the canonical-route seed. If that fetch failed entirely,
  // seed null rows (keeps the 4-row structure) and flag it so the client hook
  // refetches on mount instead of trusting the placeholder.
  const headToHeadSeedIsFallback = allProvidersFailed(headToHeadSeed);
  const initialHeadToHeadMetrics = headToHeadSeedIsFallback ? emptyProviderMetrics() : headToHeadSeed;

  return (
    <div className='min-h-screen cursor-default bg-background'>
      <TopNav />
      <main>
        <SectionFrame>
          <SectionHeader
            index='01'
            label='live quote race'
            title='Ask every provider the same question'
            rightSlot={
              <Label className={META_LABEL_CLASS}>
                powered by{' '}
                <a
                  href={PACKAGE_URL}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='cursor-pointer underline decoration-text-muted/40 underline-offset-2 hover:text-text-primary hover:decoration-text-primary'
                >
                  @wonderland/interop-cross-chain
                </a>
              </Label>
            }
          />
          <RequestBar chains={initialChains} />
          <RaceTable initialRows={initialRows} initialChains={initialChains} />
        </SectionFrame>

        <SectionFrame variant='tinted'>
          <SectionHeader
            index='02'
            label='provider leaderboard'
            title='How providers performed across all routes'
            rightSlot={<Label className={META_LABEL_CLASS}>pulled from each provider&rsquo;s public history api</Label>}
          />
          <Leaderboard metrics={leaderboardMetrics} />
        </SectionFrame>

        <SectionFrame divider={false}>
          <SectionHeader
            index='03'
            label='head-to-head · by route'
            title='Compare providers on a specific chain pair'
            rightSlot={<RouteSelector />}
          />
          <HeadToHeadClient
            initialMetrics={initialHeadToHeadMetrics}
            initialFromChainId={INITIAL_FROM_CHAIN_ID}
            initialToChainId={INITIAL_TO_CHAIN_ID}
            seedIsFallback={headToHeadSeedIsFallback}
          />
        </SectionFrame>
      </main>

      <Footer />
    </div>
  );
}

async function loadInitialChains(): Promise<NetworkAssets[]> {
  try {
    return await withTimeout(chainService.getChains(), 5_000, 'INITIAL_CHAINS_TIMEOUT');
  } catch {
    // Don't let ISR cache a degraded render: next request should retry chain discovery.
    noStore();
    return [];
  }
}

async function loadLeaderboardMetrics(chains: NetworkAssets[]): Promise<ProviderMetrics[]> {
  // Leaderboard pools provider activity across every network route (no token
  // filter, so the sample reflects every asset), for a network-wide view that
  // is distinct from the per-route head-to-head section. No outer deadline: each
  // request is already bounded by the service's client timeout, so the aggregate
  // returns partial results (per-provider null on total failure) instead of an
  // all-or-nothing wrapper that would drop the providers that did finish.
  // Thread the decimals map so Across can convert inputAmount to USD.
  const tokenDecimals = buildTokenDecimals(chains);
  const metrics = await fetchAggregatedProviderMetrics(NETWORK_ROUTES.map((route) => ({ ...route, tokenDecimals })));
  if (allProvidersFailed(metrics)) {
    // The aggregate resolves null rows instead of throwing when every provider
    // fails, so a try/catch never fires here. Opt this render out of ISR so a
    // total upstream failure isn't cached for an hour — the next request retries.
    noStore();
  }
  return metrics;
}

async function loadHeadToHeadSeed(chains: NetworkAssets[]): Promise<ProviderMetrics[]> {
  // First paint of the head-to-head section: the canonical route only, so it
  // matches the route the client hook starts on and can skip the mount fetch.
  const tokenDecimals = buildTokenDecimals(chains);
  try {
    const seed = await withTimeout(
      fetchProviderMetrics({
        originChainId: INITIAL_FROM_CHAIN_ID,
        destinationChainId: INITIAL_TO_CHAIN_ID,
        tokenDecimals,
      }),
      HEAD_TO_HEAD_SEED_TIMEOUT_MS,
      'HEAD_TO_HEAD_SEED_TIMEOUT',
    );
    if (allProvidersFailed(seed)) {
      // The fetch resolves null rows instead of throwing when every provider
      // fails, so the catch below never sees it. Same treatment as the
      // leaderboard: don't cache a degraded seed for an hour.
      noStore();
    }
    return seed;
  } catch {
    // Don't let ISR cache a degraded seed: next request retries instead of
    // serving null rows for an hour.
    noStore();
    return [];
  }
}

async function loadInitialRace(chains: NetworkAssets[]): Promise<RaceRow[]> {
  if (chains.length === 0) return orderRaceRows(createRows('errored', 'CHAIN DISCOVERY FAILED'));

  try {
    const request = buildQuoteRequest({
      chains,
      fromChainId: INITIAL_FROM_CHAIN_ID,
      toChainId: INITIAL_TO_CHAIN_ID,
      assetSymbol: INITIAL_ASSET_SYMBOL,
      amount: INITIAL_AMOUNT,
    });
    const response = await withTimeout(
      quotesService.getQuotes(request),
      INITIAL_RACE_TIMEOUT_MS,
      'INITIAL_RACE_TIMEOUT',
    );
    if (response.quotes.length === 0 && response.errors.length === 0) return orderRaceRows(createRows('idle'));
    return orderRaceRows(buildRowsFromQuotes(response.quotes, response.errors));
  } catch {
    // Don't let ISR cache a degraded render: next request should retry quotes.
    noStore();
    return orderRaceRows(createRows('idle'));
  }
}
