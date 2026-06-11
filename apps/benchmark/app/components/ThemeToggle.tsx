'use client';

import { Theme, useTheme } from '~/lib/useTheme';

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
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === Theme.Dark;

  return (
    <button
      type='button'
      onClick={toggleTheme}
      aria-label={isDark ? 'switch to light theme' : 'switch to dark theme'}
      aria-pressed={isDark}
      title={isDark ? 'switch to light theme' : 'switch to dark theme'}
      className={BUTTON_CLASS}
    >
      {isDark ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
