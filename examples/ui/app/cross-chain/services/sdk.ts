import {
  PROTOCOLS,
  createCrossChainProvider,
  createAggregator,
  OrderTrackerFactory,
  LIFI_INTENTS_ORDER_SERVER_URL,
  LIFI_INTENTS_ORDER_SERVER_DEV_URL,
  // TODO: enable after release
  // BungeeApiTier,
  type Aggregator,
  type CrossChainProvider,
} from '@wonderland/interop-cross-chain';
import { MAINNET_RPC_URLS, TESTNET_RPC_URLS } from '../constants/chains';

const OIF_API_URL = 'https://oif-api.openzeppelin.com/api';

interface ProviderConfig {
  providerId: string;
  displayName: string;
  supportsBuildQuote: boolean;
}

/**
 * Provider configuration with display names and capability flags
 */
const PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    providerId: 'across',
    displayName: 'Across Protocol',
    supportsBuildQuote: true,
  },
  {
    providerId: 'oif',
    displayName: 'OIF Sample Solver',
    supportsBuildQuote: true,
  },
  {
    providerId: 'relay',
    displayName: 'Relay',
    supportsBuildQuote: false,
  },
  {
    providerId: 'lifi-intents',
    displayName: 'LI.FI',
    supportsBuildQuote: false,
  },
  // TODO: enable after release
  // {
  //   providerId: 'bungee',
  //   displayName: 'Bungee',
  //   supportsBuildQuote: false,
  // },
];

export function buildExecutor(isTestnet: boolean): Aggregator {
  const rpcUrls = isTestnet ? TESTNET_RPC_URLS : MAINNET_RPC_URLS;
  const oifSolverId = isTestnet ? 'testnet-solver' : 'mainnet-solver';
  const lifiUrl = isTestnet ? LIFI_INTENTS_ORDER_SERVER_DEV_URL : LIFI_INTENTS_ORDER_SERVER_URL;

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
    createCrossChainProvider(PROTOCOLS.LIFI_INTENTS, {
      orderServerUrl: lifiUrl,
      providerId: 'lifi-intents',
    }),
  ];

  // TODO: enable after release
  // if (!isTestnet) {
  //   providers.push(
  //     createCrossChainProvider(PROTOCOLS.BUNGEE, {
  //       tier: BungeeApiTier.Sandbox,
  //       providerId: 'bungee',
  //     }),
  //   );
  // }

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

/** Providers that support the buildQuote flow. */
export const BUILD_QUOTE_PROVIDERS = PROVIDER_CONFIGS.filter((c) => c.supportsBuildQuote);
