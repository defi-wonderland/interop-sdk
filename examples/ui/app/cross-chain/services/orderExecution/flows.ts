import { isNativeAddress, getTransactionSteps, type ExecutableQuote } from '@wonderland/interop-cross-chain';
import { crossChainExecutor } from '../sdk';
import { handleTokenApproval, isApprovalTransaction, submitApprovalStep } from './approval';
import { submitBridgeTransaction } from './bridge';
import { signAndSubmitOrder } from './signing';
import type { ConfiguredWalletClient } from './chainSetup';
import type { Address, Hex, PublicClient } from 'viem';
import { BridgeState, ChainContext } from '~/cross-chain/hooks';

type TrackingIdentifier = { txHash: Hex } | { orderId: Hex } | { orderId: Hex; txHash: Hex };

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
    executor: crossChainExecutor,
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
  ownerAddress,
  inputTokenAddress,
  inputAmount,
  chainContext,
  onStateChange,
}: FlowParams): Promise<TrackingIdentifier> => {
  const txSteps = getTransactionSteps(quote.order);

  if (txSteps.length === 0) {
    throw new Error('Invalid quote: no transaction steps');
  }

  const isNativeInput = isNativeAddress(inputTokenAddress, 'eip155');
  let lastTxHash: Hex | undefined;

  for (const txStep of txSteps) {
    if (!txStep.transaction?.to || !txStep.transaction?.data) {
      throw new Error('Invalid quote: missing transaction data');
    }

    const txData = txStep.transaction.data as Hex;
    const txTo = txStep.transaction.to as Address;
    const value = txStep.transaction.value ? BigInt(txStep.transaction.value) : undefined;

    if (isApprovalTransaction(txData)) {
      lastTxHash = await submitApprovalStep(
        publicClient,
        walletClient,
        txTo,
        txData,
        chainContext,
        onStateChange,
        value,
      );
      continue;
    }

    if (!isNativeInput) {
      await handleTokenApproval(
        publicClient,
        walletClient,
        ownerAddress,
        inputTokenAddress,
        txTo,
        inputAmount,
        chainContext,
        onStateChange,
      );
    }

    lastTxHash = await submitBridgeTransaction(
      publicClient,
      walletClient,
      txTo,
      txData,
      chainContext,
      onStateChange,
      value,
    );
  }

  const relayRequestId = quote.order.metadata?.relayRequestId as string | undefined;

  if (relayRequestId) {
    return { orderId: relayRequestId as Hex, txHash: lastTxHash };
  }

  return { txHash: lastTxHash! };
};
