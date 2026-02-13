import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import { injectedWallet, rainbowWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http, cookieStorage, createStorage } from 'wagmi';
import { MAINNET_CHAINS, MAINNET_RPC_URLS, TESTNET_CHAINS, TESTNET_RPC_URLS } from '../constants/chains';
import { e2eWallet } from './e2eConnector';
import type { Chain } from 'viem/chains';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const isE2E = process.env.NEXT_PUBLIC_E2E === 'true';

function getWallets() {
  if (projectId) {
    return [injectedWallet, rainbowWallet, walletConnectWallet];
  }
  return [injectedWallet];
}

export function createWagmiConfig(isTestnet: boolean) {
  const chains: readonly [Chain, ...Chain[]] = isTestnet ? TESTNET_CHAINS : MAINNET_CHAINS;
  const rpcUrls = isTestnet ? TESTNET_RPC_URLS : MAINNET_RPC_URLS;
  const transports = Object.fromEntries(chains.map((chain) => [chain.id, http(rpcUrls[chain.id])]));

  if (isE2E) {
    return e2eWallet;
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
