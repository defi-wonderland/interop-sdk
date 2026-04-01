import { useState, useCallback, useRef } from 'react';
import { useCrossChainStore } from '../stores/crossChainStore';
import { convertAmountToSmallestUnit } from '../utils/amountConverter';
import { useTokenConfig } from './useNetworkConfig';
import type { GetQuotesError } from './useQuotes';
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
  quotes: ExecutableQuote[];
  errors: GetQuotesError[];
  status: BuildQuoteStatus;
  buildQuote: (params: BuildQuoteParams) => Promise<void>;
  clear: () => void;
}

export function useBuildQuote(): UseBuildQuoteReturn {
  const executor = useCrossChainStore((s) => s.executor);
  const tokenConfig = useTokenConfig();
  const [quotes, setQuotes] = useState<ExecutableQuote[]>([]);
  const [errors, setErrors] = useState<GetQuotesError[]>([]);
  const [status, setStatus] = useState<BuildQuoteStatus>(BuildQuoteStatus.IDLE);
  const requestIdRef = useRef(0);

  const buildQuote = async (params: BuildQuoteParams) => {
    const currentRequestId = ++requestIdRef.current;
    setStatus(BuildQuoteStatus.LOADING);
    setQuotes([]);
    setErrors([]);

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
        // Across provider resolves the SpokePool from its internal mapping;
        // zero address ensures unsupported chains fail instead of depositing to the user's EOA.
        escrowContractAddress: '0x0000000000000000000000000000000000000000',
        fillDeadline,
      };

      const response = await executor.buildQuote(request);
      if (requestIdRef.current !== currentRequestId) return;

      if (response.quotes?.length) {
        setQuotes(response.quotes);
      }

      if (response.errors?.length) {
        setErrors(response.errors);
      }
    } catch (err) {
      if (requestIdRef.current !== currentRequestId) return;
      setStatus(BuildQuoteStatus.ERROR);
      setErrors([
        {
          errorMsg: err instanceof Error ? err.message : String(err),
          error: err instanceof Error ? err : new Error(String(err)),
        },
      ]);
      return;
    }

    if (requestIdRef.current !== currentRequestId) return;
    setStatus(BuildQuoteStatus.SUCCESS);
  };

  const clear = useCallback(() => {
    requestIdRef.current++;
    setQuotes([]);
    setErrors([]);
    setStatus(BuildQuoteStatus.IDLE);
  }, []);

  return { quotes, errors, status, buildQuote, clear };
}
