import { WonderlandLogotype } from './WonderlandLogotype';

export function Footer() {
  return (
    <footer className='mt-12 pt-8 border-t border-border text-center text-sm text-text-tertiary'>
      <p className='flex items-center justify-center gap-x-1.5 gap-y-2 flex-wrap'>
        <span>Built with the</span>
        <a
          href='https://docs.interop.wonderland.xyz/'
          target='_blank'
          rel='noopener noreferrer'
          className='text-accent hover:opacity-80 transition-opacity'
        >
          Interop SDK
        </a>
        <span>by</span>
        <a
          href='https://wonderland.xyz/'
          target='_blank'
          rel='noopener noreferrer'
          className='text-accent hover:opacity-80 transition-opacity'
        >
          <WonderlandLogotype />
        </a>
      </p>
    </footer>
  );
}
