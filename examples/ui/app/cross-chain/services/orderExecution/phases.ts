import {
  erc20Abi,
  type Account,
  type Address,
  type Chain,
  type Hex,
  type PublicClient,
  type Transport,
  type WalletClient,
} from 'viem';
import { TIMEOUT_MS } from '../../constants';
import { EXECUTION_STATUS, type OrderExecutionState } from '../../types/execution';
import { crossChainExecutor } from '../sdk';
import { mapOrderUpdateToState } from './stateMapper';

type ConfiguredWalletClient = WalletClient<Transport, Chain, Account>;

export async function handleTokenApproval(
  publicClient: PublicClient,
  walletClient: ConfiguredWalletClient,
  userAddress: Address,
  inputTokenAddress: Address,
  spenderAddress: Address,
  inputAmount: bigint,
  onStateChange: (state: OrderExecutionState) => void,
): Promise<void> {
  onStateChange({ status: EXECUTION_STATUS.CHECKING_APPROVAL, message: 'Checking token allowance...' });

  let allowance = await publicClient.readContract({
    address: inputTokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [userAddress, spenderAddress],
  });

  if (allowance >= inputAmount) return;

  onStateChange({ status: EXECUTION_STATUS.APPROVING, message: 'Please approve token spending in your wallet...' });

  const approvalHash = await walletClient.writeContract({
    address: inputTokenAddress,
    abi: erc20Abi,
    functionName: 'approve',
    args: [spenderAddress, inputAmount],
  });

  onStateChange({
    status: EXECUTION_STATUS.APPROVING,
    message: 'Waiting for approval confirmation...',
    txHash: approvalHash,
  });

  try {
    await publicClient.waitForTransactionReceipt({ hash: approvalHash });
  } catch (receiptError) {
    console.warn('Failed to get approval receipt, verifying allowance...', receiptError);
    await new Promise((resolve) => setTimeout(resolve, TIMEOUT_MS.APPROVAL_VERIFICATION));

    allowance = await publicClient.readContract({
      address: inputTokenAddress,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [userAddress, spenderAddress],
    });

    if (allowance < inputAmount) {
      throw new Error('Approval transaction may have failed. Please try again.');
    }
  }
}

export async function submitBridgeTransaction(
  publicClient: PublicClient,
  walletClient: ConfiguredWalletClient,
  to: Address,
  data: Hex,
  onStateChange: (state: OrderExecutionState) => void,
): Promise<Hex> {
  onStateChange({
    status: EXECUTION_STATUS.SUBMITTING,
    message: 'Please confirm the bridge transaction in your wallet...',
  });

  const txHash = await walletClient.sendTransaction({ to, data });

  onStateChange({ status: EXECUTION_STATUS.CONFIRMING, message: 'Waiting for transaction confirmation...', txHash });

  let confirmed = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      confirmed = true;
      break;
    } catch (receiptError) {
      console.warn(`Attempt ${attempt + 1}: Failed to get bridge tx receipt`, receiptError);
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, TIMEOUT_MS.TX_RETRY));
      }
    }
  }

  if (!confirmed) {
    onStateChange({ status: EXECUTION_STATUS.CONFIRMING, message: 'Waiting for block confirmation...', txHash });
    await new Promise((resolve) => setTimeout(resolve, TIMEOUT_MS.BLOCK_CONFIRMATION_WAIT));
  }

  return txHash;
}

export async function trackOrder(
  providerId: string,
  txHash: Hex,
  originChainId: number,
  destinationChainId: number,
  abortSignal: AbortSignal | undefined,
  onStateChange: (state: OrderExecutionState) => void,
): Promise<void> {
  onStateChange({ status: EXECUTION_STATUS.PENDING, message: 'Transaction confirmed! Parsing order...', txHash });

  const tracker = crossChainExecutor.prepareTracking(providerId);

  try {
    for await (const update of tracker.watchOrder({
      txHash,
      originChainId,
      destinationChainId,
      timeout: TIMEOUT_MS.INTENT_TRACKING_TIMEOUT,
    })) {
      if (abortSignal?.aborted) return;

      onStateChange(mapOrderUpdateToState(update, txHash, originChainId, destinationChainId));

      if (
        update.status === EXECUTION_STATUS.COMPLETED ||
        update.status === EXECUTION_STATUS.EXPIRED ||
        update.status === EXECUTION_STATUS.FAILED
      ) {
        break;
      }
    }
  } catch (trackingErr) {
    console.warn('Order tracking failed:', trackingErr);
    onStateChange({
      status: EXECUTION_STATUS.FILLING,
      message: 'Transfer in progress! Check Across explorer for fill status.',
      txHash,
      originChainId,
      destinationChainId,
    });
  }
}
