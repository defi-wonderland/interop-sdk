import { erc20Abi, type Address, type Hex, type PublicClient } from 'viem';
import { STEP, WALLET_ACTION, type BridgeState, type ChainContext } from '../../types/execution';
import { waitForReceiptWithRetry } from '../../utils/transactionReceipt';
import type { ConfiguredWalletClient } from './chainSetup';
import type { TransactionStep } from '@wonderland/interop-cross-chain';

export async function executeApprovalStep(
  publicClient: PublicClient,
  walletClient: ConfiguredWalletClient,
  step: TransactionStep,
  chainContext: ChainContext,
  onStateChange: (state: BridgeState) => void,
): Promise<void> {
  onStateChange({ step: STEP.WALLET, action: WALLET_ACTION.APPROVING, ...chainContext });

  const value = step.transaction.value ? BigInt(step.transaction.value) : undefined;
  const parsedGas = step.transaction.gas ? BigInt(step.transaction.gas) : 0n;
  const gas = parsedGas > 0n ? parsedGas : undefined;

  const approvalHash = await walletClient.sendTransaction({
    to: step.transaction.to as Address,
    data: step.transaction.data as Hex,
    ...(value != null && { value }),
    ...(gas != null && { gas }),
  });

  onStateChange({
    step: STEP.WALLET,
    action: WALLET_ACTION.APPROVING,
    txHash: approvalHash,
    ...chainContext,
  });

  await waitForReceiptWithRetry(publicClient, approvalHash);
}

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
