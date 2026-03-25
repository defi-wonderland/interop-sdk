'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { BalanceSync } from '../components/BalanceSync';
import { createWagmiConfig } from '../config/wagmi';
import { useCrossChainStore } from '../stores/crossChainStore';
import { AssetDiscoveryProvider } from './AssetDiscoveryProvider';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Combined provider for cross-chain functionality
 * Includes wallet (wagmi/RainbowKit), network context, and asset discovery
 */
export function Providers({ children }: ProvidersProps) {
  const isTestnet = useCrossChainStore((s) => s.isTestnet);
  const config = useMemo(() => createWagmiConfig(isTestnet), [isTestnet]);
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
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
