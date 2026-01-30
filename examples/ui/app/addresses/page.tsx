import { Footer, InteractivePlayground, Navigation } from '../components';
import { CodeSnippetSection } from '../components/CodeSnippetSection';
import { getChains } from '../lib/getChains';

export default async function AddressesPage() {
  const chains = await getChains();

  return (
    <div className='min-h-screen bg-background flex flex-col'>
      <Navigation />

      <div className='flex-1 flex flex-col max-w-[680px] w-full mx-auto px-4 py-10 sm:px-6 sm:py-14'>
        <div className='flex-1 flex flex-col gap-8'>
          {/* Hero */}
          <header className='relative flex flex-col items-center gap-5 text-center py-10 sm:py-16'>
            {/* Ambient glow */}
            <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(255,132,0,0.09)_0%,transparent_70%)] opacity-80 pointer-events-none' />

            <div className='relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface border border-border text-xs font-medium'>
              <svg className='w-3.5 h-3.5 text-chain-type' viewBox='0 0 24 24' fill='currentColor'>
                <path d='M13 2L3 14h9l-1 8 10-12h-9l1-8z' />
              </svg>
              <span className='text-text-muted tracking-[0.5px]'>ERC-7930 & ERC-7828</span>
            </div>

            <h1 className='relative text-[44px] font-semibold text-text-primary tracking-[-1.5px] leading-tight'>
              Interoperable Addresses
            </h1>

            <p className='relative text-base font-sans text-text-muted leading-relaxed max-w-[560px]'>
              One address format across every chain. Build, parse, and explore cross-chain addresses in seconds.
            </p>
          </header>

          <InteractivePlayground chains={chains} />

          <CodeSnippetSection />
        </div>

        <Footer />
      </div>
    </div>
  );
}
