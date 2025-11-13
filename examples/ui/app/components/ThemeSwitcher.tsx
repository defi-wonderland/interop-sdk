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
      className='fixed top-4 right-4 z-50 p-3 rounded-full bg-surface/80 backdrop-blur border border-border/50 shadow-lg hover:scale-110 transition-transform'
      aria-label='Toggle theme'
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
