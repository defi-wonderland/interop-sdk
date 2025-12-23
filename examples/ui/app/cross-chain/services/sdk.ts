import {
  createCrossChainProvider,
  createProviderExecutor,
  IntentTrackerFactory,
} from '@wonderland/interop-cross-chain';
import { PROVIDERS, RPC_URLS } from '../constants';

/**
 * Cross-chain providers - created from PROVIDERS configuration
 */
const providers = PROVIDERS.map((providerConfig) =>
  createCrossChainProvider(providerConfig.id, providerConfig.config, {}),
);

/**
 * Intent tracker factory - handles tracking for any provider
 */
const trackerFactory = new IntentTrackerFactory({ rpcUrls: RPC_URLS });

/**
 * Cross-chain executor singleton
 * - Fetches quotes from all providers
 * - Handles intent tracking for any provider via track() method
 */
export const crossChainExecutor = createProviderExecutor({
  providers,
  trackerFactory,
});
