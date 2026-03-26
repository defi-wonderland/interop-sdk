import {
  PROTOCOLS,
  createCrossChainProvider,
  createAggregator,
  OrderTrackerFactory,
  type Aggregator,
  type CrossChainProvider,
} from '@wonderland/interop-cross-chain';
import { MAINNET_RPC_URLS, TESTNET_RPC_URLS } from '../constants/chains';

const OIF_API_URL = 'https://oif-api.openzeppelin.com/api';

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
  {
    providerId: 'relay',
    displayName: 'Relay',
  },
];

export function buildExecutor(isTestnet: boolean): Aggregator {
  const rpcUrls = isTestnet ? TESTNET_RPC_URLS : MAINNET_RPC_URLS;
  const oifSolverId = isTestnet ? 'testnet-solver' : 'mainnet-solver';

  const providers: CrossChainProvider[] = [
    createCrossChainProvider(PROTOCOLS.ACROSS, {
      isTestnet,
      providerId: 'across',
    }),
    createCrossChainProvider(PROTOCOLS.OIF, {
      solverId: oifSolverId,
      url: OIF_API_URL,
      providerId: 'oif',
    }),
    createCrossChainProvider(PROTOCOLS.RELAY, {
      isTestnet,
      providerId: 'relay',
    }),
  ];

  return createAggregator({
    providers,
    trackerFactory: new OrderTrackerFactory({ rpcUrls }),
  });
}

/**
 * Gets the display name for a provider by its ID
 * @param providerId - The provider identifier
 * @returns The display name or the provider ID if not found
 */
export function getProviderDisplayName(providerId: string): string {
  const config = PROVIDER_CONFIGS.find((c) => c.providerId === providerId);
  return config?.displayName || providerId;
}
