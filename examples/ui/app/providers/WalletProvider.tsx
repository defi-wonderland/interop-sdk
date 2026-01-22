'use client';

import { useState, type ReactNode } from 'react';
import { RainbowKitProvider, connectorsForWallets, darkTheme } from '@rainbow-me/rainbowkit';
import { injectedWallet, rainbowWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets';
import '@rainbow-me/rainbowkit/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { e2eConnector } from '@wonderland/walletless';
import { base, arbitrum, sepolia, baseSepolia, arbitrumSepolia, type Chain } from 'viem/chains';
import { WagmiProvider, createConfig, http, cookieStorage, createStorage } from 'wagmi';
import { IS_TESTNET } from '../cross-chain/config/network';
import { useRpcUrls } from '../cross-chain/hooks/useNetworkConfig';

const MAINNET_CHAINS = [base, arbitrum] as const;
const TESTNET_CHAINS = [sepolia, baseSepolia, arbitrumSepolia] as const;

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const isE2E = process.env.NEXT_PUBLIC_E2E === 'true';

function getWallets() {
  if (projectId) {
    return [injectedWallet, rainbowWallet, walletConnectWallet];
  }
  return [injectedWallet];
}

function createWagmiConfig(isTestnet: boolean, rpcUrls: Record<number, string>) {
  const chains: readonly [Chain, ...Chain[]] = isTestnet ? TESTNET_CHAINS : MAINNET_CHAINS;

  // Build transports dynamically based on selected chains
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
  const rpcUrls = useRpcUrls();
  const [config] = useState(() => createWagmiConfig(IS_TESTNET, rpcUrls));
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
