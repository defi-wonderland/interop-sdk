import { InteractivePlayground } from './components/InteractivePlayground';
import { ThemeSwitcher } from './components/ThemeSwitcher';

export default function Home() {
  return (
    <div className='min-h-screen bg-background flex flex-col'>
      <ThemeSwitcher />

      <div className='flex-1 flex flex-col gap-12 max-w-5xl w-full mx-auto px-4 py-12 sm:px-6 sm:py-16'>
        <header className='flex flex-col items-center gap-4 text-center'>
          <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-light text-accent text-xs font-medium'>
            ERC-7930 & ERC-7828
          </div>
          <h1 className='text-4xl sm:text-5xl md:text-6xl font-bold text-text-primary'>Interopable Addresses</h1>
          <p className='text-lg sm:text-xl text-text-secondary'>
            Learn how cross-chain addresses work across different formats
          </p>
        </header>

        <InteractivePlayground />

        <footer className='pt-8 border-t border-border text-center text-sm text-text-tertiary'>
          <p>Built with the Interop SDK</p>
        </footer>
      </div>
    </div>
  );
}
