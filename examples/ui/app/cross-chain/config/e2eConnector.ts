import { createE2EProvider, e2eConnector as e2eConnector } from '@wonderland/walletless';
import { baseSepolia, sepolia } from 'viem/chains';
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

export const e2eWallet = createConfig({
  chains: TESTNET_CHAINS,
  connectors: [e2eConnector({ provider: e2eTestProvider })],
  transports: {
    [sepolia.id]: http(TESTNET_RPC_URLS[sepolia.id]),
    [baseSepolia.id]: http(TESTNET_RPC_URLS[baseSepolia.id]),
  },
});
