import { useState, useCallback, useRef } from 'react';
import { crossChainExecutor } from '../services/sdk';
import { convertAmountToSmallestUnit } from '../utils/amountConverter';
import { useTokenConfig } from './useNetworkConfig';
import type { ExecutableQuote, BuildQuoteRequest } from '@wonderland/interop-cross-chain';

const DEFAULT_FILL_DEADLINE_SECS = 3600; // 1 hour

export interface BuildQuoteParams {
  sender: string;
  recipient: string;
  inputChainId: number;
  outputChainId: number;
  inputTokenAddress: string;
  outputTokenAddress: string;
  inputAmount: string;
  outputAmount: string;
  fillDeadlineSecs?: number;
}

export enum BuildQuoteStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
}

interface UseBuildQuoteReturn {
  quote: ExecutableQuote | null;
  error: string | null;
  status: BuildQuoteStatus;
  buildQuote: (params: BuildQuoteParams) => Promise<void>;
  clear: () => void;
}

export function useBuildQuote(): UseBuildQuoteReturn {
  const tokenConfig = useTokenConfig();
  const [quote, setQuote] = useState<ExecutableQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<BuildQuoteStatus>(BuildQuoteStatus.IDLE);
  const requestIdRef = useRef(0);

  const buildQuote = async (params: BuildQuoteParams) => {
    const currentRequestId = ++requestIdRef.current;
    setStatus(BuildQuoteStatus.LOADING);
    setQuote(null);
    setError(null);

    try {
      const inputTokenInfo = tokenConfig.TOKEN_INFO[params.inputChainId] ?? {};
      const outputTokenInfo = tokenConfig.TOKEN_INFO[params.outputChainId] ?? {};

      const inputAmountSmallest = convertAmountToSmallestUnit(
        params.inputAmount,
        params.inputTokenAddress,
        inputTokenInfo,
      );

      const outputAmountSmallest = convertAmountToSmallestUnit(
        params.outputAmount,
        params.outputTokenAddress,
        outputTokenInfo,
      );

      const fillDeadlineSecs = params.fillDeadlineSecs ?? DEFAULT_FILL_DEADLINE_SECS;
      const fillDeadline = Math.floor(Date.now() / 1000) + fillDeadlineSecs;

      const request: BuildQuoteRequest = {
        user: params.sender,
        input: {
          chainId: params.inputChainId,
          assetAddress: params.inputTokenAddress,
          amount: inputAmountSmallest,
        },
        output: {
          chainId: params.outputChainId,
          assetAddress: params.outputTokenAddress,
          amount: outputAmountSmallest,
          recipient: params.recipient,
        },
        escrowContractAddress: params.sender, // fallback; Across adapter uses known SpokePool
        fillDeadline,
      };

      const result = await crossChainExecutor.buildQuote('across', request);
      if (requestIdRef.current !== currentRequestId) return;
      setQuote(result);
      setStatus(BuildQuoteStatus.SUCCESS);
    } catch (err) {
      if (requestIdRef.current !== currentRequestId) return;
      setStatus(BuildQuoteStatus.ERROR);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const clear = useCallback(() => {
    requestIdRef.current++;
    setQuote(null);
    setError(null);
    setStatus(BuildQuoteStatus.IDLE);
  }, []);

  return { quote, error, status, buildQuote, clear };
}
