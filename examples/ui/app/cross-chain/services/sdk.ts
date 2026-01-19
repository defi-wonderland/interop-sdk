import { createCrossChainProvider, createProviderExecutor, OrderTrackerFactory } from '@wonderland/interop-cross-chain';
import { PROVIDERS, RPC_URLS } from '../constants';

/**
 * Cross-chain providers - created from PROVIDERS configuration
 */
const providers = PROVIDERS.map((providerConfig) =>
  createCrossChainProvider(providerConfig.id, providerConfig.config, {}),
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
