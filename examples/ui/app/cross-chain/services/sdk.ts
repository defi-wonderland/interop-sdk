import {
  PROTOCOLS,
  createCrossChainProvider,
  createProviderExecutor,
  OrderTrackerFactory,
} from '@wonderland/interop-cross-chain';
import { arbitrum, arbitrumSepolia, base, baseSepolia, sepolia } from 'viem/chains';
import { IS_TESTNET } from '../config/network';

/**
 * RPC URLs based on current network
 */
const MAINNET_RPC_URLS: Record<number, string> = {
  [base.id]: 'https://base-rpc.publicnode.com',
  [arbitrum.id]: 'https://arbitrum-one-rpc.publicnode.com',
};

const TESTNET_RPC_URLS: Record<number, string> = {
  [sepolia.id]: 'https://ethereum-sepolia-rpc.publicnode.com',
  [baseSepolia.id]: 'https://base-sepolia-rpc.publicnode.com',
  [arbitrumSepolia.id]: 'https://api.zan.top/arb-sepolia',
};

const RPC_URLS = IS_TESTNET ? TESTNET_RPC_URLS : MAINNET_RPC_URLS;

/**
 * Provider configuration with display names
 */
const PROVIDER_CONFIGS = [
  {
    protocol: PROTOCOLS.ACROSS,
    providerId: 'across',
    displayName: 'Across Protocol',
  },
];

/**
 * Cross-chain providers - created based on network configuration
 */
const providers = PROVIDER_CONFIGS.map((config) =>
  createCrossChainProvider(
    config.protocol,
    {
      isTestnet: IS_TESTNET,
      providerId: config.providerId,
    },
    {},
  ),
);

/**
 * Order tracker factory - handles tracking for any provider
 */
const trackerFactory = new OrderTrackerFactory({ rpcUrls: RPC_URLS });

/**
 * Cross-chain executor singleton
 * - Fetches quotes from all providers
 * - Handles intent tracking for any provider via track() method
 */
export const crossChainExecutor = createProviderExecutor({
  providers,
  trackerFactory,
});

/**
 * Gets the display name for a provider by its ID
 * @param providerId - The provider identifier
 * @returns The display name or the provider ID if not found
 */
export function getProviderDisplayName(providerId: string): string {
  const config = PROVIDER_CONFIGS.find((c) => c.providerId === providerId);
  return config?.displayName || providerId;
}
