import { crossChainExecutor } from '../services/sdk';

/**
 * Hook to get the cross-chain executor configured for the current network
 */
export function useCrossChainExecutor() {
  return crossChainExecutor;
}
