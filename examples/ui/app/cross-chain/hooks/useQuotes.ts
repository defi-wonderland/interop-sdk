import { useState, useCallback } from 'react';
import { crossChainAggregator } from '../services/sdk';
import { convertAmountToSmallestUnit } from '../utils/amountConverter';
import { useTokenConfig } from './useNetworkConfig';
import type { ExecutableQuote, QuoteRequest } from '@wonderland/interop-cross-chain';

interface QuoteParams {
  sender: string;
  recipient: string;
  inputChainId: number;
  outputChainId: number;
  inputTokenAddress: string;
  outputTokenAddress: string;
  inputAmount: string;
}

export interface GetQuotesError {
  errorMsg: string;
  error: Error;
}

export enum QuoteStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
}

interface UseQuotesReturn {
  quotes: ExecutableQuote[];
  errors: GetQuotesError[];
  status: QuoteStatus;
  fetchQuotes: (params: QuoteParams) => Promise<void>;
  clearQuotes: () => void;
}

export function useQuotes(): UseQuotesReturn {
  const tokenConfig = useTokenConfig();
  const [quotes, setQuotes] = useState<ExecutableQuote[]>([]);
  const [errors, setErrors] = useState<GetQuotesError[]>([]);
  const [status, setStatus] = useState<QuoteStatus>(QuoteStatus.IDLE);

  const fetchQuotes = async (params: QuoteParams) => {
    setStatus(QuoteStatus.LOADING);
    setQuotes([]);
    setErrors([]);

    try {
      const chainTokenInfo = tokenConfig.TOKEN_INFO[params.inputChainId] ?? {};
      const amountInSmallestUnit = convertAmountToSmallestUnit(
        params.inputAmount,
        params.inputTokenAddress,
        chainTokenInfo,
      );

      const quoteRequest: QuoteRequest = {
        user: params.sender,
        input: {
          asset: { chainId: params.inputChainId, address: params.inputTokenAddress },
          amount: amountInSmallestUnit,
        },
        output: {
          asset: { chainId: params.outputChainId, address: params.outputTokenAddress },
          ...(params.recipient !== params.sender && {
            recipient: params.recipient,
          }),
        },
      };

      const response = await crossChainAggregator.getQuotes(quoteRequest);

      if (response.quotes?.length) {
        setQuotes(response.quotes);
      }

      if (response.errors?.length) {
        setErrors(response.errors);
      }
    } catch (error) {
      setStatus(QuoteStatus.ERROR);
      setErrors([
        {
          errorMsg: 'Failed to fetch quotes',
          error: error instanceof Error ? error : new Error(String(error)),
        },
      ]);
      return;
    }

    setStatus(QuoteStatus.SUCCESS);
  };

  const clearQuotes = useCallback(() => {
    setQuotes([]);
    setErrors([]);
    setStatus(QuoteStatus.IDLE);
  }, []);

  return { quotes, errors, status, fetchQuotes, clearQuotes };
}
