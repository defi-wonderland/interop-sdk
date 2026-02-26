import { STEP, WALLET_ACTION, type BridgeState, type ChainContext } from '../../types/execution';
import type { ConfiguredWalletClient } from './chainSetup';
import type { ExecutableQuote, SignatureStep, ProviderExecutor } from '@wonderland/interop-cross-chain';
import type { Hex } from 'viem';

interface SignAndSubmitOrderParams {
  executor: ProviderExecutor;
  walletClient: ConfiguredWalletClient;
  quote: ExecutableQuote;
  step: SignatureStep;
  chainContext: ChainContext;
  onStateChange: (state: BridgeState) => void;
}

export const signAndSubmitOrder = async ({
  executor,
  walletClient,
  quote,
  step,
  chainContext,
  onStateChange,
}: SignAndSubmitOrderParams): Promise<{ orderId: Hex }> => {
  const { domain, types, primaryType, message } = step.signaturePayload;

  onStateChange({ step: STEP.WALLET, action: WALLET_ACTION.SIGNING, ...chainContext });

  const signature = await walletClient.signTypedData({
    domain,
    types,
    primaryType,
    message: message as Record<string, unknown>,
  });

  onStateChange({ step: STEP.WALLET, action: WALLET_ACTION.SUBMITTING, ...chainContext });

  const response = await executor.submitOrder(quote, signature);

  if (!response.orderId) {
    throw new Error('Solver did not return an orderId');
  }

  return { orderId: response.orderId as Hex };
};
