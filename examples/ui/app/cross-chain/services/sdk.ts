import {
  PROTOCOLS,
  createCrossChainProvider,
  createAggregator,
  createApprovalService,
  OrderTrackerFactory,
  LIFI_INTENTS_ORDER_SERVER_URL,
  LIFI_INTENTS_ORDER_SERVER_DEV_URL,
  BungeeApiTier,
  type Aggregator,
  type CrossChainProvider,
  type SubmissionMode,
} from '@wonderland/interop-cross-chain';
import { MAINNET_RPC_URLS, TESTNET_RPC_URLS } from '../constants/chains';

const OIF_API_URL = 'https://oif-api.openzeppelin.com/api';

interface ProviderConfig {
  providerId: string;
  displayName: string;
  supportsBuildQuote: boolean;
  supportsGasless: boolean;
}

const PROVIDER_CONFIGS: ProviderConfig[] = [
  { providerId: 'across', displayName: 'Across Protocol', supportsBuildQuote: true, supportsGasless: false },
  { providerId: 'oif', displayName: 'OIF Sample Solver', supportsBuildQuote: true, supportsGasless: true },
  { providerId: 'relay', displayName: 'Relay', supportsBuildQuote: false, supportsGasless: true },
  { providerId: 'lifi-intents', displayName: 'LI.FI', supportsBuildQuote: false, supportsGasless: false },
  { providerId: 'bungee', displayName: 'Bungee', supportsBuildQuote: false, supportsGasless: true },
];

function findConfig(providerId: string): ProviderConfig | undefined {
  return PROVIDER_CONFIGS.find((c) => c.providerId === providerId);
}

function isEnabledForMode(providerId: string, submissionMode: SubmissionMode): boolean {
  const config = findConfig(providerId);
  return config !== undefined && (submissionMode !== 'gasless' || config.supportsGasless);
}

export function buildExecutor(isTestnet: boolean, submissionMode: SubmissionMode = 'user-transaction'): Aggregator {
  const rpcUrls = isTestnet ? TESTNET_RPC_URLS : MAINNET_RPC_URLS;
  const oifSolverId = isTestnet ? 'testnet-solver' : 'mainnet-solver';
  const lifiUrl = isTestnet ? LIFI_INTENTS_ORDER_SERVER_DEV_URL : LIFI_INTENTS_ORDER_SERVER_URL;
  const submissionModes = [submissionMode];

  const providers: CrossChainProvider[] = [];

  if (isEnabledForMode('across', submissionMode)) {
    providers.push(
      createCrossChainProvider(PROTOCOLS.ACROSS, {
        isTestnet,
        providerId: 'across',
      }),
    );
  }

  if (isEnabledForMode('oif', submissionMode)) {
    // OIF mainnet-solver doesn't quote user-open-v0; skip the filter (EFI-958).
    providers.push(
      createCrossChainProvider(PROTOCOLS.OIF, {
        solverId: oifSolverId,
        url: OIF_API_URL,
        providerId: 'oif',
      }),
    );
  }

  if (isEnabledForMode('relay', submissionMode)) {
    providers.push(
      createCrossChainProvider(PROTOCOLS.RELAY, {
        isTestnet,
        providerId: 'relay',
        submissionModes,
      }),
    );
  }

  if (isEnabledForMode('lifi-intents', submissionMode)) {
    providers.push(
      createCrossChainProvider(PROTOCOLS.LIFI_INTENTS, {
        orderServerUrl: lifiUrl,
        providerId: 'lifi-intents',
      }),
    );
  }

  if (!isTestnet && isEnabledForMode('bungee', submissionMode)) {
    providers.push(
      createCrossChainProvider(PROTOCOLS.BUNGEE, {
        tier: BungeeApiTier.Sandbox,
        providerId: 'bungee',
        submissionModes,
      }),
    );
  }

  return createAggregator({
    providers,
    trackerFactory: new OrderTrackerFactory({ rpcUrls }),
    approvalService: createApprovalService({ rpcUrls }),
  });
}

export function getProviderDisplayName(providerId: string): string {
  return findConfig(providerId)?.displayName ?? providerId;
}

/** Providers that support the buildQuote flow. */
export const BUILD_QUOTE_PROVIDERS: ProviderConfig[] = PROVIDER_CONFIGS.filter((c) => c.supportsBuildQuote);
