import { isNativeAddress, getTransactionSteps, type ExecutableQuote } from '@wonderland/interop-cross-chain';
import { crossChainExecutor } from '../sdk';
import { handleTokenApproval } from './approval';
import { submitBridgeTransaction } from './bridge';
import { signAndSubmitOrder } from './signing';
import type { ConfiguredWalletClient } from './chainSetup';
import type { Address, Hex, PublicClient } from 'viem';
import type { BridgeState, ChainContext } from '~/cross-chain/hooks';

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
  chainContext,
  onStateChange,
}: FlowParams): Promise<TrackingIdentifier> => {
  const txSteps = getTransactionSteps(quote.order);
  const txStep = txSteps[0];

  if (!txStep?.transaction?.to || !txStep?.transaction?.data) {
    throw new Error('Invalid quote: missing transaction data');
  }

  const allowances = quote.order.checks?.allowances ?? [];
  for (const allowance of allowances) {
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

  const value = txStep.transaction.value ? BigInt(txStep.transaction.value) : undefined;
  const parsedGas = txStep.transaction.gas ? BigInt(txStep.transaction.gas) : 0n;
  const gas = parsedGas > 0n ? parsedGas : undefined;

  const txHash = await submitBridgeTransaction(
    publicClient,
    walletClient,
    txStep.transaction.to as Address,
    txStep.transaction.data as Hex,
    chainContext,
    onStateChange,
    value,
    gas,
  );

  return { txHash };
};
