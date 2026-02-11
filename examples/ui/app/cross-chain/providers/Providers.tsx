'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { BalanceSync } from '../components/BalanceSync';
import { createWagmiConfig } from '../config/wagmi';
import { AssetDiscoveryProvider } from './AssetDiscoveryProvider';
import { NetworkProvider } from './NetworkProvider';

interface ProvidersProps {
  children: ReactNode;
  isTestnet: boolean;
}

/**
 * Combined provider for cross-chain functionality
 * Includes wallet (wagmi/RainbowKit), network context, and asset discovery
 */
export function Providers({ children, isTestnet }: ProvidersProps) {
  const config = useMemo(() => createWagmiConfig(isTestnet), [isTestnet]);
  const [queryClient] = useState(() => new QueryClient());

  return (
    <NetworkProvider isTestnet={isTestnet}>
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
    </NetworkProvider>
  );
}
