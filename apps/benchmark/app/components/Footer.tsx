import { Label } from './Label';
import { WonderlandLogotype } from './WonderlandLogotype';

const SDK_DOCS_URL = 'https://docs.interop.wonderland.xyz/';
const WONDERLAND_URL = 'https://wonderland.xyz/';
const TEXT_LINK_CLASS =
  'cursor-pointer underline decoration-text-muted/40 underline-offset-2 hover:text-text-primary hover:decoration-text-primary';
const LOGO_LINK_CLASS = 'cursor-pointer opacity-70 transition-opacity hover:opacity-100';

export function Footer() {
  return (
    <footer className='border-t border-border-subtle'>
      <div className='mx-auto flex max-w-page items-center justify-center px-5 py-10 text-center md:px-12 md:py-8 lg:px-24'>
        <Label className='flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 font-mono text-label text-text-muted'>
          <span className='inline-flex items-baseline gap-x-1.5 whitespace-nowrap'>
            built with the
            <a href={SDK_DOCS_URL} target='_blank' rel='noopener noreferrer' className={TEXT_LINK_CLASS}>
              interop sdk
            </a>
          </span>
          <span className='inline-flex items-center gap-x-1.5 whitespace-nowrap'>
            by
            <a
              href={WONDERLAND_URL}
              target='_blank'
              rel='noopener noreferrer'
              aria-label='wonderland'
              className={`${LOGO_LINK_CLASS} inline-flex translate-y-[0.1em] items-baseline`}
            >
              <WonderlandLogotype />
            </a>
          </span>
        </Label>
      </div>
    </footer>
  );
}
