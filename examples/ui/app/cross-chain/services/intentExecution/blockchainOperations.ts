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
import { getPublicClient, getWalletClient } from 'wagmi/actions';
import { TIMEOUT_MS } from '../../constants';
import { EXECUTION_STATUS, type IntentExecutionState } from '../../types/execution';
import { crossChainExecutor } from '../sdk';
import { mapIntentUpdateToState } from './stateMapper';
import type { Config } from 'wagmi';

type ConfiguredWalletClient = WalletClient<Transport, Chain, Account>;

export interface ChainClients {
  walletClient: ConfiguredWalletClient;
  publicClient: PublicClient;
}

export async function ensureCorrectChain(
  config: Config,
  currentChainId: number | undefined,
  targetChainId: number,
  switchChainAsync: (args: { chainId: number }) => Promise<unknown>,
  onStateChange: (state: IntentExecutionState) => void,
): Promise<ChainClients> {
  if (currentChainId !== targetChainId) {
    onStateChange({
      status: EXECUTION_STATUS.SWITCHING_NETWORK,
      message: 'Please switch to the origin chain in your wallet...',
    });
    await switchChainAsync({ chainId: targetChainId });
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const walletClient = await getWalletClient(config, { chainId: targetChainId });
  const publicClient = getPublicClient(config, { chainId: targetChainId });

  if (!walletClient || !publicClient) {
    throw new Error('Failed to get wallet client for origin chain');
  }

  if (walletClient.chain?.id !== targetChainId) {
    throw new Error('Wallet is not on the correct network. Please try again.');
  }

  return { walletClient, publicClient };
}

export async function handleTokenApproval(
  publicClient: PublicClient,
  walletClient: ConfiguredWalletClient,
  userAddress: Address,
  inputTokenAddress: Address,
  spenderAddress: Address,
  inputAmount: bigint,
  onStateChange: (state: IntentExecutionState) => void,
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

  let confirmed = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await publicClient.waitForTransactionReceipt({ hash: approvalHash });
      confirmed = true;
      break;
    } catch (receiptError) {
      console.warn(`Attempt ${attempt + 1}: Failed to get approval receipt`, receiptError);
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, TIMEOUT_MS.TX_RETRY));
      }
    }
  }

  if (!confirmed) {
    console.warn('Could not confirm approval receipt, verifying allowance...');
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
  onStateChange: (state: IntentExecutionState) => void,
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

export async function trackIntent(
  providerId: string,
  txHash: Hex,
  originChainId: number,
  destinationChainId: number,
  abortSignal: AbortSignal | undefined,
  onStateChange: (state: IntentExecutionState) => void,
): Promise<void> {
  onStateChange({
    status: EXECUTION_STATUS.OPENING,
    message: 'Transaction confirmed! Parsing intent...',
    txHash,
    originChainId,
    destinationChainId,
  });

  const tracker = crossChainExecutor.prepareTracking(providerId);

  try {
    for await (const update of tracker.watchIntent({
      txHash,
      originChainId,
      destinationChainId,
      timeout: TIMEOUT_MS.INTENT_TRACKING_TIMEOUT,
    })) {
      if (abortSignal?.aborted) return;

      onStateChange(mapIntentUpdateToState(update, txHash, originChainId, destinationChainId));

      if (update.status === EXECUTION_STATUS.FILLED || update.status === EXECUTION_STATUS.EXPIRED) {
        break;
      }
    }
  } catch (trackingErr) {
    console.warn('Intent tracking failed:', trackingErr);
    onStateChange({
      status: EXECUTION_STATUS.FILLING,
      message: 'Transfer in progress! Check Across explorer for fill status.',
      txHash,
      originChainId,
      destinationChainId,
    });
  }
}
