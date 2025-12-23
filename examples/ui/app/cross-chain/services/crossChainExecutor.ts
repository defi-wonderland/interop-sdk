import { createCrossChainProvider, createProviderExecutor } from '@wonderland/interop-cross-chain';
import { PROVIDERS } from '../constants';

/**
 * Module-level cross-chain executor singleton
 * Created once per module load - PROVIDERS is constant and executor is stateless
 */
const providers = PROVIDERS.map((providerConfig) =>
  createCrossChainProvider(providerConfig.id, providerConfig.config, {}),
);

export const crossChainExecutor = createProviderExecutor({ providers });
