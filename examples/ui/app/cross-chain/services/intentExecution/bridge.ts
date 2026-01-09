import { EXECUTION_STATUS, type IntentExecutionState } from '../../types/execution';
import { waitForReceiptWithRetry } from '../../utils/transactionReceipt';
import type { ConfiguredWalletClient } from './chainSetup';
import type { Address, Hex, PublicClient } from 'viem';

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

  await waitForReceiptWithRetry(publicClient, txHash);

  return txHash;
}
