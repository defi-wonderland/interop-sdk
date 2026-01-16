'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount, useConfig, useSwitchChain } from 'wagmi';
import {
  ensureCorrectChain,
  handleTokenApproval,
  submitBridgeTransaction,
  trackOrder,
} from '../services/orderExecution';
import { STEP, isTerminal, type BridgeState, type ChainContext, type ExecuteResult } from '../types/execution';
import { isUserRejectionError, parseError } from '../utils/errorMessages';
import type { ExecutableQuote } from '@wonderland/interop-cross-chain';
import type { Address, Hex } from 'viem';

interface UseOrderExecutionReturn {
  state: BridgeState;
  execute: (
    quote: ExecutableQuote,
    inputTokenAddress: Address,
    inputAmount: bigint,
    originChainId: number,
    destinationChainId: number,
  ) => Promise<ExecuteResult>;
  reset: () => void;
  isPendingWallet: boolean;
  isTracking: boolean;
  isComplete: boolean;
}

const INITIAL_STATE: BridgeState = { step: STEP.IDLE };

export function useOrderExecution(): UseOrderExecutionReturn {
  const { address, isConnected, chainId: walletChainId } = useAccount();
  const config = useConfig();
  const { switchChainAsync } = useSwitchChain();

  const [state, setState] = useState<BridgeState>(INITIAL_STATE);
  const abortControllerRef = useRef<AbortController | null>(null);
  const expectedWalletChainIdRef = useRef<number | null>(null);

  useEffect(() => {
    const isInErrorState = state.step === STEP.ERROR;
    const isExpectingSwitch = expectedWalletChainIdRef.current !== null;
    const isWalletOnExpectedChain = walletChainId === expectedWalletChainIdRef.current;

    if (isInErrorState && isExpectingSwitch && isWalletOnExpectedChain) {
      expectedWalletChainIdRef.current = null;
      setState(INITIAL_STATE);
    }
  }, [walletChainId, state.step]);

  const isPendingWallet = state.step === STEP.WALLET;
  const isTracking = state.step === STEP.TRACKING;
  const isComplete = isTerminal(state);

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

      const chainContext: ChainContext = { originChainId, destinationChainId };

      expectedWalletChainIdRef.current = originChainId;
      setState(INITIAL_STATE);

      if (!isConnected || !address) {
        setState({
          step: STEP.ERROR,
          error: new Error('Wallet not connected'),
          message: 'Wallet not connected',
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
          step: STEP.ERROR,
          error: new Error('Invalid quote: missing transaction data'),
          message: 'Invalid quote: missing transaction data',
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

        expectedWalletChainIdRef.current = null;

        await handleTokenApproval(
          publicClient,
          walletClient,
          address,
          inputTokenAddress,
          spenderAddress,
          inputAmount,
          chainContext,
          setState,
        );

        const txHash = await submitBridgeTransaction(
          publicClient,
          walletClient,
          order.payload.to,
          order.payload.data,
          chainContext,
          setState,
        );

        const providerId = quote.provider;
        if (!providerId) {
          throw new Error('Quote missing provider identifier');
        }

        await trackOrder(providerId, txHash, chainContext, abortControllerRef.current?.signal, setState);

        return { success: true };
      } catch (err) {
        if (isUserRejectionError(err)) {
          setState(INITIAL_STATE);
          return { success: false, userRejected: true };
        }

        const error = err instanceof Error ? err : new Error(String(err));
        const parsed = parseError(err);
        const txHash = (err as { txHash?: Hex }).txHash;
        setState({
          step: STEP.ERROR,
          error,
          message: parsed.message,
          txHash,
          ...chainContext,
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
    isPendingWallet,
    isTracking,
    isComplete,
  };
}
