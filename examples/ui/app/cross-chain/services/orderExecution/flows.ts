import {
  isApprovalStep,
  getApprovalSteps,
  getTransactionSteps,
  type ExecutableQuote,
  type TrackingIdentifier,
} from '@wonderland/interop-cross-chain';
import { useCrossChainStore } from '../../stores/crossChainStore';
import { executeApprovalStep } from './approval';
import { submitBridgeTransaction } from './bridge';
import { signAndSubmitOrder } from './signing';
import type { ConfiguredWalletClient } from './chainSetup';
import type { BridgeState, ChainContext } from '../../types/execution';
import type { Hex, PublicClient } from 'viem';

interface FlowParams {
  quote: ExecutableQuote;
  walletClient: ConfiguredWalletClient;
  publicClient: PublicClient;
  chainContext: ChainContext;
  onStateChange: (state: BridgeState) => void;
}

export const submitSignableOrder = async ({
  quote,
  walletClient,
  publicClient,
  chainContext,
  onStateChange,
}: FlowParams): Promise<TrackingIdentifier> => {
  for (const step of getApprovalSteps(quote.order)) {
    await executeApprovalStep(publicClient, walletClient, step, chainContext, onStateChange);
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
  const bridgeStep = getTransactionSteps(quote.order).find((s) => !isApprovalStep(s));
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
