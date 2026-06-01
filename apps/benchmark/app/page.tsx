import { Footer } from './components/Footer';
import { Label } from './components/Label';
import { RaceTable } from './components/RaceTable';
import { RequestBar } from './components/RequestBar';
import { SectionFrame } from './components/SectionFrame';
import { SectionHeader } from './components/SectionHeader';
import { TopNav } from './components/TopNav';
import { Leaderboard } from './components/leaderboard/Leaderboard';
import { MOCK_LEADERBOARD_METRICS } from './lib/mocks/leaderboardMock';
import { PROVIDERS, ProviderId } from './lib/providers';
import type { RaceRow } from './components/race-table/types';

const META_LABEL_CLASS = 'font-mono text-label text-text-muted';
const PACKAGE_URL = 'https://www.npmjs.com/package/@wonderland/interop-cross-chain';

// Static mock fixture for the race table. PR C swaps this for live SDK results.
// Default route: USDC arbitrum -> base, $100. across wins both output and latency.
const STATIC_MOCK_ROWS: RaceRow[] = [
  {
    provider: PROVIDERS[ProviderId.Across],
    status: 'settled',
    quote: {
      providerId: 'across',
      protocolName: 'Across',
      latencyMs: 320,
      eta: 2,
      outputAmount: '99850000',
      outputAmountUsd: '99.85',
    },
  },
  {
    provider: PROVIDERS[ProviderId.Relay],
    status: 'settled',
    quote: {
      providerId: 'relay',
      protocolName: 'Relay',
      latencyMs: 480,
      eta: 4,
      outputAmount: '99800000',
      outputAmountUsd: '99.80',
    },
  },
  {
    provider: PROVIDERS[ProviderId.Lifi],
    status: 'settled',
    quote: {
      providerId: 'lifi-intents',
      protocolName: 'LI.FI',
      latencyMs: 1640,
      eta: 8,
      outputAmount: '99700000',
      outputAmountUsd: '99.70',
    },
  },
  {
    provider: PROVIDERS[ProviderId.Bungee],
    status: 'errored',
    errorMessage: 'NO ROUTE',
  },
];

export default function Home() {
  return (
    <div className='min-h-screen cursor-default bg-background'>
      <TopNav />
      <main>
        <RequestBar />

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
          <RaceTable initialRows={STATIC_MOCK_ROWS} initialChains={[]} />
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

function SectionPlaceholder({ label }: { label: string }) {
  return (
    <Label className='flex h-40 w-full items-center justify-center border border-dashed border-border-subtle bg-surface-elevated/40 font-mono text-label uppercase tracking-widest text-text-muted'>
      {label}
    </Label>
  );
}
