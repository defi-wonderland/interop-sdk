'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { RainbowKitProvider, connectorsForWallets, darkTheme } from '@rainbow-me/rainbowkit';
import { injectedWallet, rainbowWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets';
import '@rainbow-me/rainbowkit/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { e2eConnector } from '@wonderland/walletless';
import { WagmiProvider, createConfig, http, cookieStorage, createStorage } from 'wagmi';
import { MAINNET_CHAINS, MAINNET_RPC_URLS, TESTNET_CHAINS, TESTNET_RPC_URLS } from '../cross-chain/constants/chains';
import type { Chain } from 'viem/chains';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const isE2E = process.env.NEXT_PUBLIC_E2E === 'true';

function getWallets() {
  if (projectId) {
    return [injectedWallet, rainbowWallet, walletConnectWallet];
  }
  return [injectedWallet];
}

function createWagmiConfig(isTestnet: boolean) {
  const chains: readonly [Chain, ...Chain[]] = isTestnet ? TESTNET_CHAINS : MAINNET_CHAINS;
  const rpcUrls = isTestnet ? TESTNET_RPC_URLS : MAINNET_RPC_URLS;
  const transports = Object.fromEntries(chains.map((chain) => [chain.id, http(rpcUrls[chain.id])]));

  if (isE2E) {
    return createConfig({
      chains,
      ssr: true,
      connectors: [e2eConnector()],
      transports,
    });
  }

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
    transports,
    connectors,
  });
}

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const searchParams = useSearchParams();
  const isTestnet = searchParams.get('testnet') === 'true';
  const config = useMemo(() => createWagmiConfig(isTestnet), [isTestnet]);
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
