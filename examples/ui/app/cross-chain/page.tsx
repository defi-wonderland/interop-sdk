'use client';

import dynamic from 'next/dynamic';
import { Providers } from './providers';

// Client-only: wallet connection and store state depend on window, skip SSR
const CrossChainClient = dynamic(() => import('./CrossChainClient'), { ssr: false });

export default function CrossChainPage() {
  return (
    <Providers>
      <CrossChainClient />
    </Providers>
  );
}
