'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

const BUTTON_CLASS =
  'inline-flex size-8 cursor-pointer items-center justify-center rounded-[2px] border border-border-subtle ' +
  'text-text-secondary transition hover:border-text-secondary hover:text-text-primary ' +
  'active:scale-95';

function SunIcon() {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
      className='size-4'
    >
      <circle cx='12' cy='12' r='4' />
      <path d='M12 2v2' />
      <path d='M12 20v2' />
      <path d='m4.93 4.93 1.41 1.41' />
      <path d='m17.66 17.66 1.41 1.41' />
      <path d='M2 12h2' />
      <path d='M20 12h2' />
      <path d='m6.34 17.66-1.41 1.41' />
      <path d='m19.07 4.93-1.41 1.41' />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
      className='size-4'
    >
      <path d='M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' />
    </svg>
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // resolvedTheme is only known on the client, so render a stable placeholder
  // until mount to avoid a hydration mismatch.
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Non-interactive placeholder that just reserves the toggle's box until
    // mount; a real button here would look clickable but drop early clicks.
    return <span className='inline-flex size-8 rounded-[2px] border border-border-subtle' aria-hidden='true' />;
  }

  const isDark = resolvedTheme === 'dark';
  const label = isDark ? 'switch to light theme' : 'switch to dark theme';

  return (
    <button
      type='button'
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      className={BUTTON_CLASS}
    >
      {isDark ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
