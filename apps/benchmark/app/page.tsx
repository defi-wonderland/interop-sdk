import { Footer } from './components/Footer';
import { Label } from './components/Label';
import { RaceTable } from './components/RaceTable';
import { RequestBar } from './components/RequestBar';
import { SectionFrame } from './components/SectionFrame';
import { SectionHeader } from './components/SectionHeader';
import { TopNav } from './components/TopNav';

const META_LABEL_CLASS = 'font-mono text-label text-text-muted';
const PACKAGE_URL = 'https://www.npmjs.com/package/@wonderland/interop-cross-chain';

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
          <RaceTable />
        </SectionFrame>

        <SectionFrame variant='tinted'>
          <SectionHeader
            index='02'
            label='provider leaderboard · 24h ambient'
            title='how providers performed across all routes'
          />
          <SectionPlaceholder label='leaderboard arrives in pr 3' />
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
