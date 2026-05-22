import {
  createAggregator,
  createCrossChainProvider,
  LIFI_INTENTS_ORDER_SERVER_URL,
  PROTOCOLS,
} from '@wonderland/interop-cross-chain';
import type { Aggregator, CrossChainProvider } from '@wonderland/interop-cross-chain';

const OIF_SOLVER_URL = 'https://oif-api.openzeppelin.com/api';
const OIF_SOLVER_ID = 'mainnet-solver';

const providers: CrossChainProvider[] = [
  createCrossChainProvider(PROTOCOLS.ACROSS, { providerId: 'across' }),
  createCrossChainProvider(PROTOCOLS.OIF, {
    providerId: 'oif',
    solverId: OIF_SOLVER_ID,
    url: OIF_SOLVER_URL,
  }),
  createCrossChainProvider(PROTOCOLS.LIFI_INTENTS, {
    providerId: 'lifi-intents',
    orderServerUrl: LIFI_INTENTS_ORDER_SERVER_URL,
  }),
  createCrossChainProvider(PROTOCOLS.RELAY, { providerId: 'relay' }),
  createCrossChainProvider(PROTOCOLS.BUNGEE, { providerId: 'bungee' }),
];

export const aggregator: Aggregator = createAggregator({ providers });
