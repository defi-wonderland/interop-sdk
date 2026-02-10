import { getExecutorForProvider } from '../sdk';
import { handleTokenApproval } from './approval';
import { submitBridgeTransaction } from './bridge';
import { signAndSubmitOrder } from './signing';
import type { ConfiguredWalletClient } from './chainSetup';
import type { ExecutableQuote } from '@wonderland/interop-cross-chain';
import type { Address, Hex, PublicClient } from 'viem';
import { BridgeState, ChainContext } from '~/cross-chain/hooks';

type TrackingIdentifier = { txHash: Hex } | { orderId: Hex };

interface FlowParams {
  quote: ExecutableQuote;
  walletClient: ConfiguredWalletClient;
  publicClient: PublicClient;
  ownerAddress: Address;
  inputTokenAddress: Address;
  inputAmount: bigint;
  chainContext: ChainContext;
  onStateChange: (state: BridgeState) => void;
}

export const submitOifSignableOrder = async ({
  quote,
  walletClient,
  publicClient,
  ownerAddress,
  inputTokenAddress,
  inputAmount,
  chainContext,
  onStateChange,
}: FlowParams): Promise<TrackingIdentifier> => {
  const executor = getExecutorForProvider(quote._providerId);
  if (!executor) {
    throw new Error(`No executor found for provider: ${quote._providerId}`);
  }

  // Permit2 approval for escrow orders (3009 doesn't need approval)
  if (quote.order.type === 'oif-escrow-v0') {
    const PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3' as Address;
    await handleTokenApproval(
      publicClient,
      walletClient,
      ownerAddress,
      inputTokenAddress,
      PERMIT2,
      inputAmount,
      chainContext,
      onStateChange,
    );
  }

  const { orderId } = await signAndSubmitOrder({ executor, walletClient, quote, chainContext, onStateChange });
  return { orderId };
};

export const executeDirectTransaction = async ({
  quote,
  walletClient,
  publicClient,
  ownerAddress,
  inputTokenAddress,
  inputAmount,
  chainContext,
  onStateChange,
}: FlowParams): Promise<TrackingIdentifier> => {
  const order = quote.order as {
    payload?: { to?: Address; data?: Hex };
  };

  if (!order?.payload?.to || !order?.payload?.data) {
    throw new Error('Invalid quote: missing transaction data');
  }

  await handleTokenApproval(
    publicClient,
    walletClient,
    ownerAddress,
    inputTokenAddress,
    order.payload.to,
    inputAmount,
    chainContext,
    onStateChange,
  );

  const txHash = await submitBridgeTransaction(
    publicClient,
    walletClient,
    order.payload.to,
    order.payload.data,
    chainContext,
    onStateChange,
  );

  return { txHash };
};
