import { createE2EProvider, e2eConnector as e2eConnector } from '@wonderland/walletless';
import { createConfig, http } from 'wagmi';
import { ALL_CHAINS } from '../constants/chains';
import { rpcUrls, isE2E } from './publicClient';
import type { Chain } from 'viem/chains';

const e2eTestProvider = createE2EProvider({
  chains: ALL_CHAINS,
  rpcUrls,
});

// Expose provider to window for E2E test control
if (typeof window !== 'undefined' && isE2E) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__e2eTestProvider = e2eTestProvider;
}

const transports = Object.fromEntries(ALL_CHAINS.map((chain) => [chain.id, http(rpcUrls[chain.id])]));

export const e2eWallet = createConfig({
  chains: ALL_CHAINS as readonly [Chain, ...Chain[]],
  ssr: true,
  connectors: [e2eConnector({ provider: e2eTestProvider })],
  transports,
});
