'use client';

import { useCallback, useEffect, useState } from 'react';

export enum Theme {
  Light = 'light',
  Dark = 'dark',
}

const STORAGE_KEY = 'theme';

function readInitialTheme(): Theme {
  // The pre-hydration script in layout.tsx already put `light` or `dark` on
  // <html>, so trust that as the source of truth and stay in sync with it.
  if (typeof document !== 'undefined' && document.documentElement.classList.contains(Theme.Dark)) {
    return Theme.Dark;
  }
  return Theme.Light;
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.remove(Theme.Light, Theme.Dark);
  root.classList.add(theme);
}

interface UseThemeResult {
  theme: Theme;
  toggleTheme: () => void;
}

export function useTheme(): UseThemeResult {
  // Server render and first client paint both fall back to Light so markup
  // matches; the effect below reconciles with whatever the inline script chose.
  const [theme, setTheme] = useState<Theme>(Theme.Light);

  useEffect(() => {
    setTheme(readInitialTheme());
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === Theme.Dark ? Theme.Light : Theme.Dark;
      applyTheme(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // localStorage can throw in private mode; the class still applies.
      }
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
