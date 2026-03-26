import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import { injectedWallet, rainbowWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http, cookieStorage, createStorage } from 'wagmi';
import { ALL_CHAINS, ALL_RPC_URLS } from '../constants/chains';
import { e2eWallet } from './e2eConnector';
import { isE2E } from './publicClient';
import type { Chain } from 'viem/chains';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

function getWallets() {
  if (projectId) {
    return [injectedWallet, rainbowWallet, walletConnectWallet];
  }
  return [injectedWallet];
}

function createAppWagmiConfig() {
  const chains = ALL_CHAINS as readonly [Chain, ...Chain[]];
  const transports = Object.fromEntries(chains.map((chain) => [chain.id, http(ALL_RPC_URLS[chain.id])]));

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

export const wagmiConfig = isE2E ? e2eWallet : createAppWagmiConfig();
