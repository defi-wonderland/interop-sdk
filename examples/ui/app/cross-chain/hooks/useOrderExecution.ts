'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount, useConfig, useSwitchChain } from 'wagmi';
import {
  ensureCorrectChain,
  handleTokenApproval,
  submitBridgeTransaction,
  trackOrder,
} from '../services/orderExecution';
import {
  EXECUTION_STATUS,
  type ExecuteResult,
  type OrderExecutionState,
  type OrderExecutionStatus,
} from '../types/execution';
import { isUserRejectionError, parseError } from '../utils/errorMessages';
import type { ExecutableQuote } from '@wonderland/interop-cross-chain';
import type { Address, Hex } from 'viem';

interface UseOrderExecutionReturn {
  state: OrderExecutionState;
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

const INITIAL_STATE: OrderExecutionState = {
  status: EXECUTION_STATUS.IDLE,
  message: '',
};

export function useOrderExecution(): UseOrderExecutionReturn {
  const { address, isConnected, chainId: walletChainId } = useAccount();
  const config = useConfig();
  const { switchChainAsync } = useSwitchChain();

  const [state, setState] = useState<OrderExecutionState>(INITIAL_STATE);
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
    ] as OrderExecutionStatus[]
  ).includes(state.status);

  const isTracking = ([EXECUTION_STATUS.PENDING, EXECUTION_STATUS.FILLING] as OrderExecutionStatus[]).includes(
    state.status,
  );

  const isComplete = (
    [
      EXECUTION_STATUS.COMPLETED,
      EXECUTION_STATUS.EXPIRED,
      EXECUTION_STATUS.FAILED,
      EXECUTION_STATUS.ERROR,
    ] as OrderExecutionStatus[]
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

        await trackOrder(
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
