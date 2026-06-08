import Link from 'next/link';

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
      </div>
    </header>
  );
}
