'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount, useConfig, useSwitchChain } from 'wagmi';
import {
  ensureCorrectChain,
  handleTokenApproval,
  submitBridgeTransaction,
  trackIntent,
} from '../services/intentExecution';
import {
  EXECUTION_STATUS,
  type ExecuteResult,
  type IntentExecutionState,
  type IntentExecutionStatus,
} from '../types/execution';
import { isUserRejectionError, parseError } from '../utils/errorMessages';
import type { ExecutableQuote } from '@wonderland/interop-cross-chain';
import type { Address, Hex } from 'viem';

interface UseIntentExecutionReturn {
  state: IntentExecutionState;
  execute: (
    quote: ExecutableQuote,
    inputTokenAddress: Address,
    inputAmount: bigint,
    originChainId: number,
    destinationChainId: number,
  ) => Promise<ExecuteResult>;
  reset: () => void;
  isExecuting: boolean;
  isTracking: boolean;
  isComplete: boolean;
}

const INITIAL_STATE: IntentExecutionState = {
  status: EXECUTION_STATUS.IDLE,
  message: '',
};

/**
 * Hook that handles the complete intent execution flow:
 * 1. Token approval (if needed)
 * 2. Bridge transaction submission
 * 3. Intent tracking via SDK until filled/expired
 */
export function useIntentExecution(): UseIntentExecutionReturn {
  const { address, isConnected, chainId: walletChainId } = useAccount();
  const config = useConfig();
  const { switchChainAsync } = useSwitchChain();

  const [state, setState] = useState<IntentExecutionState>(INITIAL_STATE);
  const abortControllerRef = useRef<AbortController | null>(null);
  const expectedWalletChainIdRef = useRef<number | null>(null);

  useEffect(() => {
    const isInErrorState = state.status === EXECUTION_STATUS.ERROR;
    const isExpectingSwitch = expectedWalletChainIdRef.current !== null;
    const isWalletOnExpectedChain = walletChainId === expectedWalletChainIdRef.current;

    if (isInErrorState && isExpectingSwitch && isWalletOnExpectedChain) {
      expectedWalletChainIdRef.current = null;
      setState(INITIAL_STATE);
    }
  }, [walletChainId, state.status]);

  const isExecuting = (
    [
      EXECUTION_STATUS.SWITCHING_NETWORK,
      EXECUTION_STATUS.CHECKING_APPROVAL,
      EXECUTION_STATUS.APPROVING,
      EXECUTION_STATUS.SUBMITTING,
      EXECUTION_STATUS.CONFIRMING,
    ] as IntentExecutionStatus[]
  ).includes(state.status);

  const isTracking = (
    [EXECUTION_STATUS.OPENING, EXECUTION_STATUS.OPENED, EXECUTION_STATUS.FILLING] as IntentExecutionStatus[]
  ).includes(state.status);

  const isComplete = (
    [EXECUTION_STATUS.FILLED, EXECUTION_STATUS.EXPIRED, EXECUTION_STATUS.ERROR] as IntentExecutionStatus[]
  ).includes(state.status);

  const execute = useCallback(
    async (
      quote: ExecutableQuote,
      inputTokenAddress: Address,
      inputAmount: bigint,
      originChainId: number,
      destinationChainId: number,
    ): Promise<ExecuteResult> => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      expectedWalletChainIdRef.current = originChainId;
      setState({ status: EXECUTION_STATUS.IDLE, message: '' });

      if (!isConnected || !address) {
        setState({
          status: EXECUTION_STATUS.ERROR,
          message: 'Wallet not connected',
          error: new Error('Wallet not connected'),
        });
        return { success: false };
      }

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
          status: EXECUTION_STATUS.ERROR,
          message: 'Invalid quote: missing transaction data',
          error: new Error('Invalid quote: missing transaction data'),
        });
        return { success: false };
      }

      const spenderAddress = order.payload.to;

      try {
        const { walletClient, publicClient } = await ensureCorrectChain(
          config,
          walletChainId,
          originChainId,
          switchChainAsync,
          setState,
        );

        await handleTokenApproval(
          publicClient,
          walletClient,
          address,
          inputTokenAddress,
          spenderAddress,
          inputAmount,
          setState,
        );

        const txHash = await submitBridgeTransaction(
          publicClient,
          walletClient,
          order.payload.to,
          order.payload.data,
          setState,
        );

        const providerId = quote.provider;
        if (!providerId) {
          throw new Error('Quote missing provider identifier');
        }

        await trackIntent(
          providerId,
          txHash,
          originChainId,
          destinationChainId,
          abortControllerRef.current?.signal,
          setState,
        );

        return { success: true };
      } catch (err) {
        if (isUserRejectionError(err)) {
          setState(INITIAL_STATE);
          return { success: false, userRejected: true };
        }

        const error = err instanceof Error ? err : new Error(String(err));
        const parsed = parseError(err);
        setState({
          status: EXECUTION_STATUS.ERROR,
          message: parsed.message,
          error,
        });
        return { success: false };
      }
    },
    [isConnected, address, walletChainId, config, switchChainAsync],
  );

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    expectedWalletChainIdRef.current = null;
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
