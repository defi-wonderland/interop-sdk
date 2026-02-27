'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount, useConfig, useSwitchChain } from 'wagmi';
import {
  ensureCorrectChain,
  executeSignatureStep,
  executeTransactionStep,
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
  abortTracking: () => void;
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

        // For multi-step orders (e.g. Relay's approve + deposit), use the last
        // step for execution. The UI's handleTokenApproval already handles
        // ERC-20 approvals independently, so intermediate approve steps are
        // redundant and can be skipped safely.
        if (quote.order.steps.length > 1) {
          console.warn(
            `[useOrderExecution] Order has ${quote.order.steps.length} steps, using last step only. ` +
              `Skipped steps: ${quote.order.steps
                .slice(0, -1)
                .map((s) => s.description ?? s.kind)
                .join(', ')}`,
          );
        }
        const step = quote.order.steps[quote.order.steps.length - 1];
        if (!step) {
          throw new Error('Invalid quote: order has no steps');
        }

        const flowParams = {
          quote,
          walletClient,
          publicClient,
          ownerAddress: address,
          inputTokenAddress,
          inputAmount,
          chainContext,
          onStateChange: setState,
        };

        const stepResult =
          step.kind === 'signature'
            ? await executeSignatureStep({ ...flowParams, step })
            : await executeTransactionStep({ ...flowParams, step });

        // For providers that track by requestId (e.g. Relay), use orderId-based
        // tracking instead of txHash-based tracking.
        const rawRequestId = quote.metadata?.requestId;
        const requestId = typeof rawRequestId === 'string' ? rawRequestId : undefined;
        const trackingId = requestId ? { orderId: requestId as Hex } : stepResult;

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
        ]).catch((err) => {
          console.warn('[useOrderExecution] Balance refresh failed:', err);
        });
      }
    },
    [isConnected, address, walletChainId, config, switchChainAsync, updateBalances],
  );

  const abortTracking = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortTracking();
    expectedWalletChainIdRef.current = null;
    setState(INITIAL_STATE);
  }, [abortTracking]);

  return {
    state,
    execute,
    reset,
    abortTracking,
    isPendingWallet,
    isTracking,
    isComplete,
  };
}
