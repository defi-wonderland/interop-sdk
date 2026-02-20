'use client';

import { useEffect, useState } from 'react';
import { MoonIcon, SunIcon } from './icons/Icons';

const THEME_KEY = 'theme';

export function ThemeSwitcher() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light') {
      setIsDark(false);
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  const toggleTheme = () => {
    setIsDark((prevIsDark) => {
      const next = prevIsDark ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(THEME_KEY, next);
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
