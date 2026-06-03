import { unstable_noStore as noStore } from 'next/cache';
import { Footer } from './components/Footer';
import { Label } from './components/Label';
import { RaceTable } from './components/RaceTable';
import { RequestBar } from './components/RequestBar';
import { SectionFrame } from './components/SectionFrame';
import { SectionHeader } from './components/SectionHeader';
import { TopNav } from './components/TopNav';
import { Leaderboard } from './components/leaderboard/Leaderboard';
import { buildQuoteRequest, buildRowsFromQuotes, createRows, orderRaceRows } from './components/race-table/raceRows';
import { withTimeout } from './lib/helpers';
import { MOCK_LEADERBOARD_METRICS } from './lib/mocks/leaderboardMock';
import {
  INITIAL_AMOUNT,
  INITIAL_ASSET_SYMBOL,
  INITIAL_FROM_CHAIN_ID,
  INITIAL_TO_CHAIN_ID,
} from './lib/requestBarDefaults';
import { chainService, quotesService } from './lib/services';
import type { RaceRow } from './components/race-table/types';
import type { NetworkAssets } from '@wonderland/interop-cross-chain';

export const revalidate = 3600;

const META_LABEL_CLASS = 'font-mono text-label text-text-muted';
const PACKAGE_URL = 'https://www.npmjs.com/package/@wonderland/interop-cross-chain';
const INITIAL_RACE_TIMEOUT_MS = 20_000;

export default async function Home() {
  const initialChains = await loadInitialChains();
  const initialRows = await loadInitialRace(initialChains);

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
            rightSlot={<Label className={META_LABEL_CLASS}>showing fixture data &middot; wire-up arrives next</Label>}
          />
          <Leaderboard metrics={MOCK_LEADERBOARD_METRICS} />
        </SectionFrame>

        <SectionFrame divider={false}>
          <SectionHeader
            index='03'
            label='head-to-head · by route'
            title='compare providers on the selected chain pair'
          />
          <SectionPlaceholder label='comparison table arrives in pr 4' />
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

function SectionPlaceholder({ label }: { label: string }) {
  return (
    <Label className='flex h-40 w-full items-center justify-center border border-dashed border-border-subtle bg-surface-elevated/40 font-mono text-label uppercase tracking-widest text-text-muted'>
      {label}
    </Label>
  );
}
