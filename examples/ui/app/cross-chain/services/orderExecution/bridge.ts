import { STEP, WALLET_ACTION, type BridgeState, type ChainContext } from '../../types/execution';
import { waitForReceiptWithRetry } from '../../utils/transactionReceipt';
import type { ConfiguredWalletClient } from './chainSetup';
import type { Address, Hex, PublicClient } from 'viem';

export async function submitBridgeTransaction(
  publicClient: PublicClient,
  walletClient: ConfiguredWalletClient,
  to: Address,
  data: Hex,
  chainContext: ChainContext,
  onStateChange: (state: BridgeState) => void,
): Promise<Hex> {
  onStateChange({ step: STEP.WALLET, action: WALLET_ACTION.SUBMITTING, ...chainContext });

  const txHash = await walletClient.sendTransaction({ to, data });

  onStateChange({ step: STEP.WALLET, action: WALLET_ACTION.CONFIRMING, txHash, ...chainContext });

  await waitForReceiptWithRetry(publicClient, txHash);

  return txHash;
}
