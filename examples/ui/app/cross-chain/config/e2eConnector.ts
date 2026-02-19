import { createE2EProvider, e2eConnector as e2eConnector } from '@wonderland/walletless';
import { createConfig, http } from 'wagmi';
import { TESTNET_CHAINS, TESTNET_RPC_URLS } from '../constants/chains';

const isE2E = process.env.NEXT_PUBLIC_E2E === 'true';

const e2eTestProvider = createE2EProvider({
  chains: TESTNET_CHAINS,
  rpcUrls: TESTNET_RPC_URLS,
});

// Expose provider to window for E2E test control
if (typeof window !== 'undefined' && isE2E) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__e2eTestProvider = e2eTestProvider;
}

const transports = Object.fromEntries(TESTNET_CHAINS.map((chain) => [chain.id, http(TESTNET_RPC_URLS[chain.id])]));

export const e2eWallet = createConfig({
  chains: TESTNET_CHAINS,
  ssr: true,
  connectors: [e2eConnector({ provider: e2eTestProvider })],
  transports,
});
