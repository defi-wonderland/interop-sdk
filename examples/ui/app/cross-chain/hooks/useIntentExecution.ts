'use client';

import { useCallback, useRef, useState } from 'react';
import { createIntentTracker, type ExecutableQuote, type IntentUpdate } from '@wonderland/interop-cross-chain';
import { erc20Abi, type Address, type Hex } from 'viem';
import { sepolia, baseSepolia, arbitrumSepolia } from 'viem/chains';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';

// Public RPC URLs for intent tracking (read-only operations)
const RPC_URLS: Record<number, string> = {
  [sepolia.id]: 'https://ethereum-sepolia-rpc.publicnode.com',
  [baseSepolia.id]: 'https://base-sepolia-rpc.publicnode.com',
  [arbitrumSepolia.id]: 'https://api.zan.top/arb-sepolia',
};

/**
 * All possible states during intent execution and tracking
 */
export type IntentExecutionStatus =
  | 'idle' // Not started
  | 'checking-approval' // Checking if token approval is needed
  | 'approving' // Waiting for approval transaction
  | 'submitting' // Sending bridge transaction
  | 'confirming' // Waiting for bridge tx to confirm on origin chain
  | 'opening' // SDK: Parsing intent from transaction
  | 'opened' // SDK: Intent opened, orderId available
  | 'filling' // SDK: Waiting for relayer to fill on destination chain
  | 'filled' // SDK: Intent successfully filled!
  | 'expired' // SDK: Fill deadline passed
  | 'error'; // Something failed

export interface IntentExecutionState {
  status: IntentExecutionStatus;
  message: string;
  txHash?: Hex;
  fillTxHash?: Hex;
  orderId?: Hex;
  error?: Error;
}

interface UseIntentExecutionReturn {
  state: IntentExecutionState;
  execute: (
    quote: ExecutableQuote,
    inputTokenAddress: Address,
    inputAmount: bigint,
    originChainId: number,
    destinationChainId: number,
  ) => Promise<void>;
  reset: () => void;
  isExecuting: boolean;
  isTracking: boolean;
  isComplete: boolean;
}

const INITIAL_STATE: IntentExecutionState = {
  status: 'idle',
  message: '',
};

/**
 * Hook that handles the complete intent execution flow:
 * 1. Token approval (if needed)
 * 2. Bridge transaction submission
 * 3. Intent tracking via SDK until filled/expired
 */
export function useIntentExecution(): UseIntentExecutionReturn {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [state, setState] = useState<IntentExecutionState>(INITIAL_STATE);
  const abortControllerRef = useRef<AbortController | null>(null);

  const isExecuting = ['checking-approval', 'approving', 'submitting', 'confirming'].includes(state.status);
  const isTracking = ['opening', 'opened', 'filling'].includes(state.status);
  const isComplete = ['filled', 'expired', 'error'].includes(state.status);

  const execute = useCallback(
    async (
      quote: ExecutableQuote,
      inputTokenAddress: Address,
      inputAmount: bigint,
      originChainId: number,
      destinationChainId: number,
    ) => {
      // Cancel any previous tracking
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setState({ status: 'idle', message: '' });

      if (!isConnected || !address) {
        setState({ status: 'error', message: 'Wallet not connected', error: new Error('Wallet not connected') });
        return;
      }

      if (!walletClient || !publicClient) {
        setState({
          status: 'error',
          message: 'Wallet client not available',
          error: new Error('Wallet client not available'),
        });
        return;
      }

      // Extract transaction data from order payload
      const order = quote.order as {
        type?: string;
        payload?: {
          to?: Address;
          data?: Hex;
          chainId?: number;
        };
      };

      if (!order?.payload?.to || !order?.payload?.data) {
        setState({
          status: 'error',
          message: 'Invalid quote: missing transaction data',
          error: new Error('Invalid quote: missing transaction data'),
        });
        return;
      }

      const spenderAddress = order.payload.to;

      try {
        // ========== PHASE 1: Token Approval ==========
        setState({ status: 'checking-approval', message: 'Checking token allowance...' });

        let allowance = await publicClient.readContract({
          address: inputTokenAddress,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [address, spenderAddress],
        });

        if (allowance < inputAmount) {
          setState({ status: 'approving', message: 'Please approve token spending in your wallet...' });

          const approvalHash = await walletClient.writeContract({
            address: inputTokenAddress,
            abi: erc20Abi,
            functionName: 'approve',
            args: [spenderAddress, inputAmount],
          });

          setState({ status: 'approving', message: 'Waiting for approval confirmation...', txHash: approvalHash });

          // Wait for approval confirmation with retry logic
          try {
            await publicClient.waitForTransactionReceipt({ hash: approvalHash });
          } catch (receiptError) {
            console.warn('Failed to get approval receipt, verifying allowance...', receiptError);
            await new Promise((resolve) => setTimeout(resolve, 2000));

            allowance = await publicClient.readContract({
              address: inputTokenAddress,
              abi: erc20Abi,
              functionName: 'allowance',
              args: [address, spenderAddress],
            });

            if (allowance < inputAmount) {
              throw new Error('Approval transaction may have failed. Please try again.');
            }
          }
        }

        // ========== PHASE 2: Bridge Transaction ==========
        setState({ status: 'submitting', message: 'Please confirm the bridge transaction in your wallet...' });

        const txHash = await walletClient.sendTransaction({
          to: order.payload.to,
          data: order.payload.data,
        });

        setState({ status: 'confirming', message: 'Waiting for transaction confirmation...', txHash });

        // Wait for transaction confirmation - this is REQUIRED before tracking
        // The Open event won't exist until the transaction is mined
        let confirmed = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await publicClient.waitForTransactionReceipt({ hash: txHash });
            confirmed = true;
            break;
          } catch (receiptError) {
            console.warn(`Attempt ${attempt + 1}: Failed to get bridge tx receipt`, receiptError);
            if (attempt < 2) {
              await new Promise((resolve) => setTimeout(resolve, 3000));
            }
          }
        }

        if (!confirmed) {
          // Transaction might still be pending - wait a bit more
          setState({ status: 'confirming', message: 'Waiting for block confirmation...', txHash });
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }

        // ========== PHASE 3: Intent Tracking ==========
        setState({ status: 'opening', message: 'Transaction confirmed! Parsing intent...', txHash });

        // Create tracker for the protocol
        const provider = (quote.provider || 'across') as 'across';
        const tracker = createIntentTracker(provider, {
          rpcUrls: RPC_URLS,
        });

        try {
          // Watch the intent with async generator
          for await (const update of tracker.watchIntent({
            txHash,
            originChainId,
            destinationChainId,
            timeout: 10 * 60 * 1000, // 10 minutes
          })) {
            // Check if aborted
            if (abortControllerRef.current?.signal.aborted) {
              return;
            }

            // Map SDK update to our state
            const newState = mapIntentUpdateToState(update, txHash);
            setState(newState);

            // Stop if we reached a terminal state
            if (update.status === 'filled' || update.status === 'expired') {
              break;
            }
          }
        } catch (trackingErr) {
          // Tracking failed - show as "filling" with manual check message
          console.warn('Intent tracking failed:', trackingErr);
          setState({
            status: 'filling',
            message: 'Transfer in progress! Check Across explorer for fill status.',
            txHash,
          });
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setState({
          status: 'error',
          message: error.message,
          error,
          txHash: state.txHash,
        });
      }
    },
    [isConnected, address, walletClient, publicClient, state.txHash],
  );

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState(INITIAL_STATE);
  }, []);

  return {
    state,
    execute,
    reset,
    isExecuting,
    isTracking,
    isComplete,
  };
}

/**
 * Maps SDK IntentUpdate to our IntentExecutionState
 */
function mapIntentUpdateToState(update: IntentUpdate, txHash: Hex): IntentExecutionState {
  return {
    status: update.status as IntentExecutionStatus,
    message: update.message,
    txHash,
    fillTxHash: update.fillTxHash,
    orderId: update.orderId,
  };
}
