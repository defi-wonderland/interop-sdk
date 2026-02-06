import {
  PROTOCOLS,
  createCrossChainProvider,
  createProviderExecutor,
  OrderTrackerFactory,
  createAssetDiscoveryService,
  StaticAssetDiscoveryService,
  type AssetDiscoveryService,
  type CrossChainProvider,
  type NetworkAssets,
} from '@wonderland/interop-cross-chain';
import { MAINNET_RPC_URLS, TESTNET_RPC_URLS, TESTNET_CHAINS } from '../constants/chains';
import { getIsTestnet } from '../providers';

const IS_TESTNET = getIsTestnet();
const IS_E2E = process.env.NEXT_PUBLIC_E2E === 'true';
const RPC_URLS = IS_TESTNET ? TESTNET_RPC_URLS : MAINNET_RPC_URLS;

/**
 * Static assets for E2E testing - avoids network calls that may timeout
 */
const E2E_STATIC_ASSETS: NetworkAssets[] = TESTNET_CHAINS.map((chain) => ({
  chainId: chain.id,
  assets: [
    {
      address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // USDC on testnets
      symbol: 'USDC',
      decimals: 6,
    },
  ],
}));

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
  createCrossChainProvider(config.protocol, {
    isTestnet: IS_TESTNET,
    providerId: config.providerId,
  }),
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

const assetDiscoveryServices: Map<string, AssetDiscoveryService> = new Map();

// In E2E mode, use static assets to avoid network timeouts
if (IS_E2E) {
  const staticService = new StaticAssetDiscoveryService(E2E_STATIC_ASSETS, 'across');
  assetDiscoveryServices.set('across', staticService);
} else {
  providers.forEach((provider: CrossChainProvider) => {
    const service = createAssetDiscoveryService(provider);
    if (service) {
      assetDiscoveryServices.set(provider.getProviderId(), service);
    }
  });
}

/**
 * Get all asset discovery services
 */
export function getAssetDiscoveryServices(): Map<string, AssetDiscoveryService> {
  return assetDiscoveryServices;
}

/**
 * Get asset discovery service for a specific provider
 * @param providerId - The provider identifier (e.g., 'across')
 * @returns The asset discovery service or undefined if not supported
 */
export function getAssetDiscoveryService(providerId: string): AssetDiscoveryService | undefined {
  return assetDiscoveryServices.get(providerId);
}
