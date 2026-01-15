import { erc20Abi, type Address, type PublicClient } from 'viem';
import { EXECUTION_STATUS, type IntentExecutionState } from '../../types/execution';
import { waitForReceiptWithRetry } from '../../utils/transactionReceipt';
import type { ConfiguredWalletClient } from './chainSetup';

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

  const allowance = await publicClient.readContract({
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

  await waitForReceiptWithRetry(publicClient, approvalHash);
}
