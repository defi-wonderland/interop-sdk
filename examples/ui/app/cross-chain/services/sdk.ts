import {
  PROTOCOLS,
  createCrossChainProvider,
  createProviderExecutor,
  OrderTrackerFactory,
} from '@wonderland/interop-cross-chain';
import { MAINNET_RPC_URLS, TESTNET_RPC_URLS } from '../constants/chains';
import { getIsTestnet } from '../providers';

const IS_TESTNET = getIsTestnet();
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
