'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { createWagmiConfig } from '../config/wagmi';
import { NetworkProvider } from './NetworkProvider';

interface ProvidersProps {
  children: ReactNode;
  isTestnet: boolean;
}

/**
 * Combined provider for cross-chain functionality
 * Includes wallet (wagmi/RainbowKit) and network context
 */
export function Providers({ children, isTestnet }: ProvidersProps) {
  const config = useMemo(() => createWagmiConfig(isTestnet), [isTestnet]);
  const [queryClient] = useState(() => new QueryClient());

  return (
    <NetworkProvider isTestnet={isTestnet}>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider modalSize='compact' theme={darkTheme()}>
            {children}
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </NetworkProvider>
  );
}
