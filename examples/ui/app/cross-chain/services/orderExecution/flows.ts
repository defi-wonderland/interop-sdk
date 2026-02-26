import {
  isNativeAddress,
  type ExecutableQuote,
  type SignatureStep,
  type TransactionStep,
} from '@wonderland/interop-cross-chain';
import { crossChainExecutor } from '../sdk';
import { handleTokenApproval } from './approval';
import { submitBridgeTransaction } from './bridge';
import { signAndSubmitOrder } from './signing';
import type { ConfiguredWalletClient } from './chainSetup';
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

const PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3' as Address;

export const executeSignatureStep = async ({
  quote,
  step,
  walletClient,
  publicClient,
  ownerAddress,
  inputTokenAddress,
  inputAmount,
  chainContext,
  onStateChange,
}: FlowParams & { step: SignatureStep }): Promise<TrackingIdentifier> => {
  // Escrow lock requires Permit2 approval (3009/compact don't)
  const isEscrowLock = quote.order.lock?.type === 'oif-escrow';
  const isNativeInput = isNativeAddress(inputTokenAddress, 'eip155');
  if (isEscrowLock && !isNativeInput) {
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
    step,
    chainContext,
    onStateChange,
  });
  return { orderId };
};

export const executeTransactionStep = async ({
  step,
  walletClient,
  publicClient,
  ownerAddress,
  inputTokenAddress,
  inputAmount,
  chainContext,
  onStateChange,
}: Omit<FlowParams, 'quote'> & { step: TransactionStep }): Promise<TrackingIdentifier> => {
  const { to, data } = step.transaction;

  if (!to || !data) {
    throw new Error('Invalid quote: missing transaction data');
  }

  const isNativeInput = isNativeAddress(inputTokenAddress, 'eip155');

  if (!isNativeInput) {
    await handleTokenApproval(
      publicClient,
      walletClient,
      ownerAddress,
      inputTokenAddress,
      to as Address,
      inputAmount,
      chainContext,
      onStateChange,
    );
  }

  const value = isNativeInput ? inputAmount : undefined;

  const txHash = await submitBridgeTransaction(
    publicClient,
    walletClient,
    to as Address,
    data as Hex,
    chainContext,
    onStateChange,
    value,
  );

  return { txHash };
};
