import Link from 'next/link';
import { Footer, Navigation } from './components';

export default function Home() {
  return (
    <div className='min-h-screen bg-background flex flex-col'>
      <Navigation />

      <div className='flex-1 flex flex-col max-w-5xl w-full mx-auto px-4 py-12 sm:px-6 sm:py-16'>
        <div className='flex-1 flex flex-col gap-12'>
          <header className='flex flex-col items-center gap-4 text-center'>
            <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-light text-accent text-xs font-medium'>
              Interop SDK
            </div>
            <h1 className='text-4xl sm:text-5xl md:text-6xl font-bold text-text-primary'>Demo Showcase</h1>
            <p className='text-lg sm:text-xl text-text-secondary'>Interactive demonstrations of Interop SDK features</p>
          </header>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto w-full'>
            <Link
              href='/addresses'
              className='group relative p-8 rounded-lg border border-border bg-surface hover:bg-surface-secondary transition-all hover:border-accent hover:shadow-lg'
            >
              <div className='flex flex-col gap-4'>
                <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-light text-accent text-xs font-medium w-fit'>
                  ERC-7930 & ERC-7828
                </div>
                <h2 className='text-2xl font-bold text-text-primary'>Interoperable Addresses</h2>
                <p className='text-text-secondary'>Learn how cross-chain addresses work across different formats</p>
                <div className='flex items-center gap-2 text-accent text-sm font-medium mt-2'>
                  <span>Explore demo</span>
                  <svg
                    className='w-4 h-4 transition-transform group-hover:translate-x-1'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                  </svg>
                </div>
              </div>
            </Link>

            <Link
              href='/cross-chain'
              className='group relative p-8 rounded-lg border border-border bg-surface hover:bg-surface-secondary transition-all hover:border-accent hover:shadow-lg'
            >
              <div className='flex flex-col gap-4'>
                <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-light text-accent text-xs font-medium w-fit'>
                  EIP-7683 & Intents
                </div>
                <h2 className='text-2xl font-bold text-text-primary'>Cross-Chain Intent Swap</h2>
                <p className='text-text-secondary'>
                  Experience seamless cross-chain transfers with intent-based routing
                </p>
                <div className='flex items-center gap-2 text-accent text-sm font-medium mt-2'>
                  <span>Explore demo</span>
                  <svg
                    className='w-4 h-4 transition-transform group-hover:translate-x-1'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                  </svg>
                </div>
              </div>
            </Link>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}
