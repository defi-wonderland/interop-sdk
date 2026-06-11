'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';

interface ProvidersProps {
  children: ReactNode;
}

// Class-based theming (`html.dark`) driven by next-themes: it handles the
// no-flash pre-paint script, localStorage persistence, and system preference.
export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
      {children}
    </ThemeProvider>
  );
}
