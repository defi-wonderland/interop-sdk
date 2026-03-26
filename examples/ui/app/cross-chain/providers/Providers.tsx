'use client';

import { useState, type ReactNode } from 'react';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { BalanceSync } from '../components/BalanceSync';
import { wagmiConfig } from '../config/wagmi';
import { initializeNetwork } from '../stores/crossChainStore';
import { AssetDiscoveryProvider } from './AssetDiscoveryProvider';

interface ProvidersProps {
  children: ReactNode;
  initialIsTestnet?: boolean;
}

/**
 * Combined provider for cross-chain functionality
 * Includes wallet (wagmi/RainbowKit), network context, and asset discovery
 */
export function Providers({ children, initialIsTestnet }: ProvidersProps) {
  useState(() => {
    if (initialIsTestnet !== undefined) initializeNetwork(initialIsTestnet);
  });

  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider modalSize='compact' theme={darkTheme()}>
          <AssetDiscoveryProvider>
            <BalanceSync />
            {children}
          </AssetDiscoveryProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
