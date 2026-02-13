'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount, useConfig, useSwitchChain } from 'wagmi';
import {
  ensureCorrectChain,
  executeDirectTransaction,
  submitOifSignableOrder,
  trackOrder,
} from '../services/orderExecution';
import { useBalanceStore } from '../stores/balanceStore';
import { STEP, isTerminal, type BridgeState, type ChainContext, type ExecuteResult } from '../types/execution';
import { isUserRejectionError, parseError } from '../utils/errorMessages';
import type { ExecutableQuote } from '@wonderland/interop-cross-chain';
import type { Address, Hex } from 'viem';

interface UseOrderExecutionReturn {
  state: BridgeState;
  execute: (
    quote: ExecutableQuote,
    inputTokenAddress: Address,
    outputTokenAddress: Address,
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

  const { updateBalances } = useBalanceStore();

  const execute = useCallback(
    async (
      quote: ExecutableQuote,
      inputTokenAddress: Address,
      outputTokenAddress: Address,
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

      try {
        // Common: ensure wallet is on the correct chain
        const { walletClient, publicClient } = await ensureCorrectChain(
          config,
          walletChainId,
          originChainId,
          switchChainAsync,
          setState,
        );
        expectedWalletChainIdRef.current = null;

        // Branch: OIF signable vs direct transaction
        const isSignable = quote.order.type === 'oif-escrow-v0' || quote.order.type === 'oif-3009-v0';
        const executeFlow = isSignable ? submitOifSignableOrder : executeDirectTransaction;

        const trackingId = await executeFlow({
          quote,
          walletClient,
          publicClient,
          ownerAddress: address,
          inputTokenAddress,
          inputAmount,
          chainContext,
          onStateChange: setState,
        });

        // Common: track order
        await trackOrder(quote._providerId, trackingId, chainContext, abortControllerRef.current?.signal, setState);

        if (address) {
          updateBalances(address, [
            { chainId: originChainId, token: inputTokenAddress },
            { chainId: destinationChainId, token: outputTokenAddress },
          ]).catch((balanceErr: unknown) => {
            console.warn(
              `[useOrderExecution] Balance refresh failed (origin: ${originChainId}, dest: ${destinationChainId}):`,
              balanceErr,
            );
          });
        }

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
      } finally {
        updateBalances(address!, [
          { chainId: originChainId, token: inputTokenAddress },
          { chainId: destinationChainId, token: outputTokenAddress },
        ]).catch((balanceErr: unknown) => {
          console.warn('[useOrderExecution] Balance refresh failed:', balanceErr);
        });
      }
    },
    [isConnected, address, walletChainId, config, switchChainAsync, updateBalances],
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
