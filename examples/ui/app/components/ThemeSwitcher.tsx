'use client';

import { useState } from 'react';
import { MoonIcon, SunIcon } from './icons/Icons';

export function ThemeSwitcher() {
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => {
    setIsDark((prevIsDark) => {
      document.documentElement.setAttribute('data-theme', prevIsDark ? 'light' : 'dark');
      return !prevIsDark;
    });
  };

  return (
    <button
      onClick={toggleTheme}
      className='p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer'
      aria-label='Toggle theme'
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
