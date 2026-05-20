import Link from 'next/link';
import { Label } from './Label';

// TODO(pr-2): replace with live cache freshness from server revalidation.
const MOCK_LAST_UPDATED = 'updated 14s ago';

export function TopNav() {
  return (
    <header className='border-b border-border-subtle'>
      <div className='mx-auto flex max-w-page items-center justify-between px-5 py-4 md:px-12 md:py-5 lg:px-24'>
        <h1 className='font-mono text-mark font-medium tracking-tight text-text-primary'>
          <Link
            href='/'
            aria-label='interop bench home'
            className='inline-flex cursor-pointer items-center gap-2.5 transition-opacity hover:opacity-80'
          >
            <span>interop</span>
            <span aria-hidden='true' className='text-text-muted'>
              ·
            </span>
            <span>bench</span>
          </Link>
        </h1>
        <div className='flex items-center gap-2.5'>
          <Label className='inline-flex items-center gap-2 border border-border px-2.5 py-1'>
            <span className='inline-block h-1.5 w-1.5 rounded-full bg-accent' aria-hidden='true' />
            <span className='font-mono text-caption font-medium tracking-widest text-text-primary'>LIVE</span>
          </Label>
          <Label className='hidden font-mono text-label text-text-muted sm:inline'>{MOCK_LAST_UPDATED}</Label>
        </div>
      </div>
    </header>
  );
}
