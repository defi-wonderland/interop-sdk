import { erc20Abi, type Address, type Hex, type PublicClient } from 'viem';
import { STEP, WALLET_ACTION, type BridgeState, type ChainContext } from '../../types/execution';
import { waitForReceiptWithRetry } from '../../utils/transactionReceipt';
import type { ConfiguredWalletClient } from './chainSetup';

const ERC20_APPROVE_SELECTOR = '0x095ea7b3';

/** Detects ERC-20 `approve(address,uint256)` calls by their 4-byte function selector. */
export function isApprovalTransaction(data: string): boolean {
  return data.startsWith(ERC20_APPROVE_SELECTOR);
}

/** Sends a pre-built approval transaction (e.g. from a Relay step) through the wallet. */
export async function submitApprovalStep(
  publicClient: PublicClient,
  walletClient: ConfiguredWalletClient,
  to: Address,
  data: Hex,
  chainContext: ChainContext,
  onStateChange: (state: BridgeState) => void,
  value?: bigint,
): Promise<Hex> {
  onStateChange({ step: STEP.WALLET, action: WALLET_ACTION.APPROVING, ...chainContext });

  const approvalHash = await walletClient.sendTransaction({
    to,
    data,
    ...(value != null && { value }),
  });

  onStateChange({ step: STEP.WALLET, action: WALLET_ACTION.APPROVING, txHash: approvalHash, ...chainContext });

  await waitForReceiptWithRetry(publicClient, approvalHash);

  return approvalHash;
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
