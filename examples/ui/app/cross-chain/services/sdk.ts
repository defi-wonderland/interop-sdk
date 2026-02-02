import {
  PROTOCOLS,
  createCrossChainProvider,
  createProviderExecutor,
  OrderTrackerFactory,
  PROVIDERS,
  getProvidersForToken,
  Provider,
} from '@wonderland/interop-cross-chain';
import { MAINNET_RPC_URLS, TESTNET_RPC_URLS } from '../constants/chains';
import { getIsTestnet } from '../providers';

const IS_TESTNET = getIsTestnet();
const RPC_URLS = IS_TESTNET ? TESTNET_RPC_URLS : MAINNET_RPC_URLS;

const OIF_API_URL = 'https://oif-api.openzeppelin.com/api';

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  [PROVIDERS.ACROSS]: 'Across Protocol',
  [PROVIDERS.OIF]: 'OIF Sample Solver',
};

const trackerFactory = new OrderTrackerFactory({ rpcUrls: RPC_URLS });

const acrossProvider = createCrossChainProvider(PROTOCOLS.ACROSS, {
  isTestnet: IS_TESTNET,
  providerId: PROVIDERS.ACROSS,
});

const oifProvider = createCrossChainProvider(PROTOCOLS.OIF, {
  solverId: 'oif-sample-solver',
  url: OIF_API_URL,
  providerId: PROVIDERS.OIF,
});

export const acrossExecutor = createProviderExecutor({
  providers: [acrossProvider],
  trackerFactory,
});

export const oifExecutor = createProviderExecutor({
  providers: [oifProvider],
  trackerFactory,
});

export const crossChainExecutor = createProviderExecutor({
  providers: [acrossProvider, oifProvider],
  trackerFactory,
});

type ProviderExecutor = ReturnType<typeof createProviderExecutor>;

const executorByProvider: Record<Provider, ProviderExecutor> = {
  [PROVIDERS.OIF]: oifExecutor,
  [PROVIDERS.ACROSS]: acrossExecutor,
};

interface TokenPair {
  inputChainId: number;
  inputTokenAddress: string;
  outputChainId: number;
  outputTokenAddress: string;
}

/**
 * Returns the executor for a provider that supports both input and output tokens.
 * Returns undefined if no provider supports the token pair.
 */
export function getExecutorForTokenPair(pair: TokenPair): ProviderExecutor | undefined {
  const inputProviders = getProvidersForToken(pair.inputChainId, pair.inputTokenAddress);
  const outputProviders = getProvidersForToken(pair.outputChainId, pair.outputTokenAddress);

  const commonProvider = inputProviders.find((p) => outputProviders.includes(p));

  if (!commonProvider) return;

  return executorByProvider[commonProvider];
}

export function getProviderDisplayName(providerId: string): string {
  return PROVIDER_DISPLAY_NAMES[providerId] || providerId;
}
