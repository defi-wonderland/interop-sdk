import { erc20Abi, type Address, type PublicClient } from 'viem';
import { STEP, WALLET_ACTION, type BridgeState, type ChainContext } from '../../types/execution';
import { waitForReceiptWithRetry } from '../../utils/transactionReceipt';
import type { ConfiguredWalletClient } from './chainSetup';

export async function handleTokenApproval(
  publicClient: PublicClient,
  walletClient: ConfiguredWalletClient,
  userAddress: Address,
  inputTokenAddress: Address,
  spenderAddress: Address,
  inputAmount: bigint,
  chainContext: ChainContext,
  onStateChange: (state: BridgeState) => void,
): Promise<void> {
  onStateChange({ step: STEP.WALLET, action: WALLET_ACTION.CHECKING, ...chainContext });

  const allowance = await publicClient.readContract({
    address: inputTokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [userAddress, spenderAddress],
  });

  if (allowance >= inputAmount) return;

  onStateChange({ step: STEP.WALLET, action: WALLET_ACTION.APPROVING, ...chainContext });

  const approvalHash = await walletClient.writeContract({
    address: inputTokenAddress,
    abi: erc20Abi,
    functionName: 'approve',
    args: [spenderAddress, inputAmount],
  });

  onStateChange({ step: STEP.WALLET, action: WALLET_ACTION.APPROVING, txHash: approvalHash, ...chainContext });

  await waitForReceiptWithRetry(publicClient, approvalHash);
}
