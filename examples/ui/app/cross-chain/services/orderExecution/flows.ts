import { isNativeAddress, getTransactionSteps, type ExecutableQuote } from '@wonderland/interop-cross-chain';
import { crossChainExecutor } from '../sdk';
import { handleTokenApproval, isApprovalTransaction, submitApprovalStep } from './approval';
import { submitBridgeTransaction } from './bridge';
import { signAndSubmitOrder } from './signing';
import type { ConfiguredWalletClient } from './chainSetup';
import type { Address, Hex, PublicClient } from 'viem';
import type { BridgeState, ChainContext } from '~/cross-chain/hooks';

type TrackingIdentifier = { txHash: Hex } | { orderId: Hex } | { orderId: Hex; txHash: Hex };

/**
 * Builds the tracking identifier from a completed transaction.
 * Relay quotes include a `relayRequestId` in metadata that the tracking
 * endpoint needs as `orderId`. Other providers only need the tx hash.
 */
function resolveTrackingIdentifier(quote: ExecutableQuote, txHash: Hex): TrackingIdentifier {
  const orderId = quote.order.metadata?.relayRequestId as string | undefined;
  if (orderId) return { orderId: orderId as Hex, txHash };
  return { txHash };
}

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

interface TransactionStep {
  transaction?: { to?: string; data?: string; value?: string; gas?: string };
}

async function processTransactionStep(
  txStep: TransactionStep,
  publicClient: PublicClient,
  walletClient: ConfiguredWalletClient,
  chainContext: ChainContext,
  onStateChange: (state: BridgeState) => void,
): Promise<Hex> {
  if (!txStep.transaction?.to || !txStep.transaction?.data) {
    throw new Error('Invalid quote: missing transaction data');
  }

  const txData = txStep.transaction.data as Hex;
  const txTo = txStep.transaction.to as Address;
  const value = txStep.transaction.value ? BigInt(txStep.transaction.value) : undefined;
  const parsedGas = txStep.transaction.gas ? BigInt(txStep.transaction.gas) : 0n;
  const gas = parsedGas > 0n ? parsedGas : undefined;

  if (isApprovalTransaction(txData)) {
    return submitApprovalStep(publicClient, walletClient, txTo, txData, chainContext, onStateChange, value, gas);
  }

  return submitBridgeTransaction(publicClient, walletClient, txTo, txData, chainContext, onStateChange, value, gas);
}

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

  const hasEmbeddedApprovalStep = txSteps.some(
    (step) => step.transaction?.data && isApprovalTransaction(step.transaction.data as Hex),
  );

  if (!hasEmbeddedApprovalStep && quote.order.checks?.allowances?.length) {
    for (const allowance of quote.order.checks.allowances) {
      await handleTokenApproval(
        publicClient,
        walletClient,
        ownerAddress,
        allowance.tokenAddress as Address,
        allowance.spender as Address,
        BigInt(allowance.required),
        chainContext,
        onStateChange,
      );
    }
  } else if (!hasEmbeddedApprovalStep && !isNativeAddress(inputTokenAddress, 'eip155')) {
    const spender = txSteps[0]?.transaction?.to as Address;
    await handleTokenApproval(
      publicClient,
      walletClient,
      ownerAddress,
      inputTokenAddress,
      spender,
      inputAmount,
      chainContext,
      onStateChange,
    );
  }

  let lastTxHash: Hex | undefined;

  for (const txStep of txSteps) {
    lastTxHash = await processTransactionStep(txStep, publicClient, walletClient, chainContext, onStateChange);
  }

  if (!lastTxHash) {
    throw new Error('No bridge transaction found');
  }

  return resolveTrackingIdentifier(quote, lastTxHash);
};
