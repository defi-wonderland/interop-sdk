import {
  PROTOCOLS,
  createCrossChainProvider,
  createAggregator,
  OrderTrackerFactory,
  type CrossChainProvider,
} from '@wonderland/interop-cross-chain';
import { MAINNET_RPC_URLS, TESTNET_RPC_URLS } from '../constants/chains';
import { getIsTestnet } from '../providers';

const IS_TESTNET = getIsTestnet();
const RPC_URLS = IS_TESTNET ? TESTNET_RPC_URLS : MAINNET_RPC_URLS;

const OIF_API_URL = 'https://oif-api.openzeppelin.com/api';
const OIF_SOLVER_ID = IS_TESTNET ? 'testnet-solver' : 'mainnet-solver';

/**
 * Provider configuration with display names
 */
const PROVIDER_CONFIGS = [
  {
    providerId: 'across',
    displayName: 'Across Protocol',
  },
  {
    providerId: 'oif',
    displayName: 'OIF Sample Solver',
  },
];

/**
 * Cross-chain providers
 */
const providers: CrossChainProvider[] = [
  createCrossChainProvider(PROTOCOLS.ACROSS, {
    isTestnet: IS_TESTNET,
    providerId: 'across',
  }),
  createCrossChainProvider(PROTOCOLS.OIF, {
    solverId: OIF_SOLVER_ID,
    url: OIF_API_URL,
    providerId: 'oif',
    supportedLocks: ['oif-escrow'],
  }),
];

/**
 * Order tracker factory - handles tracking for any provider
 */
const trackerFactory = new OrderTrackerFactory({ rpcUrls: RPC_URLS });

/**
 * Cross-chain aggregator singleton
 * - Fetches quotes from all providers
 * - Handles intent tracking for any provider via track() method
 * - Asset discovery via discoverAssets() / getProvidersForRoute()
 */
export const crossChainAggregator = createAggregator({
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
