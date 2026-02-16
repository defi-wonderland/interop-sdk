import { isSignableOifOrder, type ExecutableQuote, type ProviderExecutor } from '@wonderland/interop-cross-chain';
import { STEP, WALLET_ACTION, type BridgeState, type ChainContext } from '../../types/execution';
import type { ConfiguredWalletClient } from './chainSetup';
import type { Hex } from 'viem';

interface SignAndSubmitOrderParams {
  executor: ProviderExecutor;
  walletClient: ConfiguredWalletClient;
  quote: ExecutableQuote;
  chainContext: ChainContext;
  onStateChange: (state: BridgeState) => void;
}

export const signAndSubmitOrder = async ({
  executor,
  walletClient,
  quote,
  chainContext,
  onStateChange,
}: SignAndSubmitOrderParams): Promise<{ orderId: Hex }> => {
  const { order } = quote;
  const isSignable = isSignableOifOrder(order);
  if (!isSignable) {
    throw new Error(`Unsupported order type for signing: ${order.type}`);
  }

  const { domain, types, primaryType, message } = order.payload;

  onStateChange({ step: STEP.WALLET, action: WALLET_ACTION.SIGNING, ...chainContext });

  const signature = await walletClient.signTypedData({
    domain,
    types,
    primaryType,
    message: message as Record<string, unknown>,
  });

  onStateChange({ step: STEP.WALLET, action: WALLET_ACTION.SUBMITTING, ...chainContext });

  const response = await executor.submitSignedOrder(quote, signature);

  if (!response.orderId) {
    throw new Error('Solver did not return an orderId');
  }

  return { orderId: response.orderId as Hex };
};
