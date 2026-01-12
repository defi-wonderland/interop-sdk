'use client';

import { useState, type ReactNode } from 'react';
import { RainbowKitProvider, connectorsForWallets, darkTheme } from '@rainbow-me/rainbowkit';
import { injectedWallet, rainbowWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets';
import '@rainbow-me/rainbowkit/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { sepolia, baseSepolia, arbitrumSepolia } from 'viem/chains';
import { WagmiProvider, createConfig, http, cookieStorage, createStorage } from 'wagmi';

const chains = [sepolia, baseSepolia, arbitrumSepolia] as const;

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

function getWallets() {
  if (projectId) {
    return [injectedWallet, rainbowWallet, walletConnectWallet];
  }
  return [injectedWallet];
}

function getConfig() {
  const connectors = connectorsForWallets([{ groupName: 'Recommended', wallets: getWallets() }], {
    appName: 'Interop SDK Demo',
    projectId: projectId || '',
  });

  return createConfig({
    chains,
    ssr: true,
    storage: createStorage({
      storage: cookieStorage,
    }),
    transports: {
      [sepolia.id]: http(),
      [baseSepolia.id]: http(),
      [arbitrumSepolia.id]: http(),
    },
    connectors,
  });
}

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [config] = useState(() => getConfig());
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider modalSize='compact' theme={darkTheme()}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
