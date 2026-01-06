import { TIMEOUT_MS } from '../constants';
import type { Hex, PublicClient, TransactionReceipt } from 'viem';

export class RevertError extends Error {
  readonly txHash: Hex;

  constructor(txHash: Hex) {
    super('Transaction reverted on-chain.');
    this.name = 'RevertError';
    this.txHash = txHash;
  }
}

export async function waitForReceiptWithRetry(
  publicClient: PublicClient,
  txHash: Hex,
  maxAttempts = 3,
  retryDelay = TIMEOUT_MS.TX_RETRY,
): Promise<TransactionReceipt> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      if (receipt.status === 'reverted') {
        throw new RevertError(txHash);
      }

      return receipt;
    } catch (e) {
      if (e instanceof RevertError) throw e;

      console.warn(`Attempt ${attempt + 1}: Failed to get receipt`, e);
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  throw new Error('Failed to get transaction receipt after retries.');
}
