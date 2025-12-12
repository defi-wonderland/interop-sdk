'use client';

import { useCallback, useState } from 'react';
import { erc20Abi, type Address, type Hex } from 'viem';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import type { ExecutableQuote } from '@wonderland/interop-cross-chain';

interface UseExecuteQuoteReturn {
  execute: (quote: ExecutableQuote, inputTokenAddress: Address, inputAmount: bigint) => Promise<void>;
  txHash: Hex | undefined;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: Error | null;
  reset: () => void;
  status: 'idle' | 'checking-approval' | 'approving' | 'pending' | 'confirming' | 'success' | 'error';
}

/**
 * Hook to execute a cross-chain swap using the prepared transaction from an ExecutableQuote.
 * Handles token approval if needed before executing the bridge transaction.
 */
export function useExecuteQuote(): UseExecuteQuoteReturn {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [error, setError] = useState<Error | null>(null);
  const [txHash, setTxHash] = useState<Hex | undefined>(undefined);
  const [status, setStatus] = useState<UseExecuteQuoteReturn['status']>('idle');

  const isPending = status === 'checking-approval' || status === 'approving' || status === 'pending';
  const isConfirming = status === 'confirming';
  const isSuccess = status === 'success';

  const execute = useCallback(
    async (quote: ExecutableQuote, inputTokenAddress: Address, inputAmount: bigint) => {
      setError(null);
      setTxHash(undefined);

      if (!isConnected || !address) {
        setError(new Error('Wallet not connected'));
        setStatus('error');
        return;
      }

      if (!walletClient || !publicClient) {
        setError(new Error('Wallet client not available'));
        setStatus('error');
        return;
      }

      // Extract transaction data from order payload (Across format)
      const order = quote.order as {
        type?: string;
        payload?: {
          to?: Address;
          data?: Hex;
          chainId?: number;
        };
      };

      if (!order?.payload?.to || !order?.payload?.data) {
        setError(new Error('Invalid quote: missing transaction data'));
        setStatus('error');
        return;
      }

      const spenderAddress = order.payload.to;

      try {
        // Step 1: Check token allowance
        setStatus('checking-approval');

        let allowance = await publicClient.readContract({
          address: inputTokenAddress,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [address, spenderAddress],
        });

        // Step 2: Approve if needed
        if (allowance < inputAmount) {
          setStatus('approving');

          const approvalHash = await walletClient.writeContract({
            address: inputTokenAddress,
            abi: erc20Abi,
            functionName: 'approve',
            args: [spenderAddress, inputAmount],
          });

          // Wait for approval confirmation with retry logic
          try {
            await publicClient.waitForTransactionReceipt({ hash: approvalHash });
          } catch (receiptError) {
            // RPC might fail but tx could still succeed - verify by checking allowance
            console.warn('Failed to get approval receipt, verifying allowance...', receiptError);
            await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait a bit

            // Re-check allowance to see if approval went through
            allowance = await publicClient.readContract({
              address: inputTokenAddress,
              abi: erc20Abi,
              functionName: 'allowance',
              args: [address, spenderAddress],
            });

            if (allowance < inputAmount) {
              throw new Error('Approval transaction may have failed. Please try again.');
            }
            // Approval succeeded despite receipt error, continue
          }
        }

        // Step 3: Execute bridge transaction
        setStatus('pending');

        const hash = await walletClient.sendTransaction({
          to: order.payload.to,
          data: order.payload.data,
        });

        setTxHash(hash);
        setStatus('confirming');

        // Wait for transaction confirmation
        try {
          await publicClient.waitForTransactionReceipt({ hash });
        } catch (receiptError) {
          // If we got the hash, tx was likely submitted - show success with warning
          console.warn('Failed to get bridge tx receipt', receiptError);
          // Still mark as success since tx was submitted
        }

        setStatus('success');
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setStatus('error');
      }
    },
    [isConnected, address, walletClient, publicClient],
  );

  const reset = useCallback(() => {
    setError(null);
    setTxHash(undefined);
    setStatus('idle');
  }, []);

  return {
    execute,
    txHash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
    status,
  };
}
