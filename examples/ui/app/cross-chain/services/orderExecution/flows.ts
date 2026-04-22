import {
  isNativeAddress,
  isApprovalStep,
  getApprovalSteps,
  getTransactionSteps,
  type ExecutableQuote,
  type TransactionStep,
} from '@wonderland/interop-cross-chain';
import { useCrossChainStore } from '../../stores/crossChainStore';
import { executeApprovalStep, handleTokenApproval } from './approval';
import { submitBridgeTransaction } from './bridge';
import { signAndSubmitOrder } from './signing';
import type { ConfiguredWalletClient } from './chainSetup';
import type { BridgeState, ChainContext, TrackingIdentifier } from '../../types/execution';
import type { Address, Hex, PublicClient } from 'viem';

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
  // Permit2 approval for escrow lock orders (3009 doesn't need approval)
  const isEscrowOrder = quote.order.lock?.type === 'oif-escrow';
  const isNativeInput = isNativeAddress(inputTokenAddress, 'eip155');
  if (isEscrowOrder && !isNativeInput) {
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

  const { orderId } = await signAndSubmitOrder({
    executor: useCrossChainStore.getState().executor,
    walletClient,
    quote,
    chainContext,
    onStateChange,
  });
  return { orderId };
};

export const executeDirectTransaction = async ({
  quote,
  walletClient,
  publicClient,
  chainContext,
  onStateChange,
}: FlowParams): Promise<TrackingIdentifier> => {
  const [bridgeStep] = getTransactionSteps(quote.order).filter((s): s is TransactionStep => !isApprovalStep(s));
  if (!bridgeStep) {
    throw new Error('Invalid quote: missing bridge transaction step');
  }

  for (const step of getApprovalSteps(quote.order)) {
    await executeApprovalStep(publicClient, walletClient, step, chainContext, onStateChange);
  }

  const txHash = await submitBridgeTransaction(publicClient, walletClient, bridgeStep, chainContext, onStateChange);

  const orderId = quote.tracking?.orderId;
  return orderId ? { orderId: orderId as Hex, txHash } : { txHash };
};
