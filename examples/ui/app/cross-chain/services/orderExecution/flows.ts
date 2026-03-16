import { isNativeAddress, getTransactionSteps, type ExecutableQuote } from '@wonderland/interop-cross-chain';
import { crossChainExecutor } from '../sdk';
import { handleTokenApproval, isApprovalTransaction, submitApprovalStep } from './approval';
import { submitBridgeTransaction } from './bridge';
import { signAndSubmitOrder } from './signing';
import type { ConfiguredWalletClient } from './chainSetup';
import type { BridgeState, ChainContext, TrackingIdentifier } from '../../types/execution';
import type { Address, Hex, PublicClient } from 'viem';

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

function parseTransactionFields(txStep: TransactionStep): { to: Address; data: Hex; value?: bigint; gas?: bigint } {
  if (!txStep.transaction?.to || !txStep.transaction?.data) {
    throw new Error('Invalid quote: missing transaction data');
  }

  const parsedGas = txStep.transaction.gas ? BigInt(txStep.transaction.gas) : 0n;

  return {
    to: txStep.transaction.to as Address,
    data: txStep.transaction.data as Hex,
    value: txStep.transaction.value ? BigInt(txStep.transaction.value) : undefined,
    gas: parsedGas > 0n ? parsedGas : undefined,
  };
}

async function processTransactionStep(
  txStep: TransactionStep,
  publicClient: PublicClient,
  walletClient: ConfiguredWalletClient,
  chainContext: ChainContext,
  onStateChange: (state: BridgeState) => void,
): Promise<Hex> {
  const { to, data, value, gas } = parseTransactionFields(txStep);

  if (isApprovalTransaction(data)) {
    return submitApprovalStep(publicClient, walletClient, to, data, chainContext, onStateChange, undefined, gas);
  }

  return submitBridgeTransaction(publicClient, walletClient, to, data, chainContext, onStateChange, value, gas);
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
    const spender = txSteps[0]?.transaction?.to;
    if (!spender) throw new Error('Invalid quote: missing spender address for token approval');
    await handleTokenApproval(
      publicClient,
      walletClient,
      ownerAddress,
      inputTokenAddress,
      spender as Address,
      inputAmount,
      chainContext,
      onStateChange,
    );
  }

  let bridgeTxHash: Hex | undefined;

  for (const txStep of txSteps) {
    const txHash = await processTransactionStep(txStep, publicClient, walletClient, chainContext, onStateChange);
    const isApproval = txStep.transaction?.data && isApprovalTransaction(txStep.transaction.data as Hex);
    if (!isApproval) bridgeTxHash = txHash;
  }

  if (!bridgeTxHash) {
    throw new Error('No bridge transaction found');
  }

  return resolveTrackingIdentifier(quote, bridgeTxHash);
};
