import { STEP, WALLET_ACTION, type BridgeState, type ChainContext } from '../../types/execution';
import { waitForReceiptWithRetry } from '../../utils/transactionReceipt';
import type { ConfiguredWalletClient } from './chainSetup';
import type { TransactionStep } from '@wonderland/interop-cross-chain';
import type { Address, Hex, PublicClient } from 'viem';

export async function submitBridgeTransaction(
  publicClient: PublicClient,
  walletClient: ConfiguredWalletClient,
  step: TransactionStep,
  chainContext: ChainContext,
  onStateChange: (state: BridgeState) => void,
): Promise<Hex> {
  onStateChange({ step: STEP.WALLET, action: WALLET_ACTION.SUBMITTING, ...chainContext });

  const value = step.transaction.value ? BigInt(step.transaction.value) : undefined;
  const parsedGas = step.transaction.gas ? BigInt(step.transaction.gas) : 0n;
  const gas = parsedGas > 0n ? parsedGas : undefined;

  const txHash = await walletClient.sendTransaction({
    to: step.transaction.to as Address,
    data: step.transaction.data as Hex,
    ...(value != null && { value }),
    ...(gas != null && { gas }),
  });

  onStateChange({ step: STEP.WALLET, action: WALLET_ACTION.CONFIRMING, txHash, ...chainContext });

  await waitForReceiptWithRetry(publicClient, txHash);

  return txHash;
}
