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
import { withTimeout } from './lib/helpers';
import {
  INITIAL_AMOUNT,
  INITIAL_ASSET_SYMBOL,
  INITIAL_FROM_CHAIN_ID,
  INITIAL_TO_CHAIN_ID,
} from './lib/requestBarDefaults';
import { chainService, quotesService } from './lib/services';
import { allProvidersFailed, emptyProviderMetrics, fetchProviderMetrics } from './lib/services/providerMetrics';
import type { RaceRow } from './components/race-table/types';
import type { ProviderMetrics } from './lib/types/historyMetrics';
import type { NetworkAssets } from '@wonderland/interop-cross-chain';

export const revalidate = 3600;

const META_LABEL_CLASS = 'font-mono text-label text-text-muted';
const PACKAGE_URL = 'https://www.npmjs.com/package/@wonderland/interop-cross-chain';
const INITIAL_RACE_TIMEOUT_MS = 20_000;
const LEADERBOARD_TIMEOUT_MS = 15_000;

export default async function Home() {
  const initialChains = await loadInitialChains();
  const [initialRows, leaderboardMetrics] = await Promise.all([
    loadInitialRace(initialChains),
    loadLeaderboardMetrics(),
  ]);

  // Head-to-head seeds with the same canonical-route metrics on first paint
  // and then refetches client-side on route changes. The two will diverge once
  // EFI-975 wires multi-route aggregation for the leaderboard. When the
  // leaderboard fetch failed entirely (thrown timeout or every provider
  // resolving null-filled), seed null-filled rows so the section keeps its
  // 4-row structure rather than rendering an empty table; `seedIsFallback`
  // tells the client hook to refetch on mount in that case.
  const headToHeadSeedIsFallback = allProvidersFailed(leaderboardMetrics);
  const initialHeadToHeadMetrics = headToHeadSeedIsFallback ? emptyProviderMetrics() : leaderboardMetrics;

  return (
    <div className='min-h-screen cursor-default bg-background'>
      <TopNav />
      <main>
        <RequestBar chains={initialChains} />

        <SectionFrame>
          <SectionHeader
            index='01'
            label='live quote race'
            title='ask every provider the same question'
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
          <RaceTable initialRows={initialRows} initialChains={initialChains} />
        </SectionFrame>

        <SectionFrame variant='tinted'>
          <SectionHeader
            index='02'
            label='provider leaderboard · 24h ambient'
            title='how providers performed across all routes'
            rightSlot={<Label className={META_LABEL_CLASS}>pulled from each provider&rsquo;s public history api</Label>}
          />
          <Leaderboard metrics={leaderboardMetrics} />
        </SectionFrame>

        <SectionFrame divider={false}>
          <SectionHeader
            index='03'
            label='head-to-head · by route'
            title='compare providers on a specific chain pair'
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

async function loadLeaderboardMetrics(): Promise<ProviderMetrics[]> {
  // Leaderboard reads "ambient" activity on the canonical route. We use the
  // initial route with no token filter so the sample reflects every asset on
  // that pair. EFI-975 tracks aggregating across multiple top routes.
  try {
    return await withTimeout(
      fetchProviderMetrics({
        originChainId: INITIAL_FROM_CHAIN_ID,
        destinationChainId: INITIAL_TO_CHAIN_ID,
      }),
      LEADERBOARD_TIMEOUT_MS,
      'LEADERBOARD_TIMEOUT',
    );
  } catch {
    // Don't let ISR cache an empty leaderboard: the next request should retry
    // the upstream fetch instead of serving the degraded render for an hour.
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
