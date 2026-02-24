import { useState, useCallback } from 'react';
import { nameToBinary } from '@wonderland/interop-addresses';
import { crossChainExecutor } from '../services/sdk';
import { convertAmountToSmallestUnit } from '../utils/amountConverter';
import { useTokenConfig } from './useNetworkConfig';
import type { ExecutableQuote } from '@wonderland/interop-cross-chain';

/**
 * Converts a hex address to EIP-7930 interoperable address format
 */
async function toInteropAddress(address: string, chainId: number): Promise<string> {
  return (await nameToBinary(`${address}@eip155:${chainId}`, { format: 'hex' })) as string;
}

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

      const [userAddress, receiverAddress, inputAssetAddress, outputAssetAddress] = await Promise.all([
        toInteropAddress(params.sender, params.inputChainId),
        toInteropAddress(params.recipient, params.outputChainId),
        toInteropAddress(params.inputTokenAddress, params.inputChainId),
        toInteropAddress(params.outputTokenAddress, params.outputChainId),
      ]);

      const getQuoteRequest = {
        user: userAddress,
        intent: {
          intentType: 'oif-swap' as const,
          inputs: [
            {
              user: userAddress,
              asset: inputAssetAddress,
              amount: amountInSmallestUnit,
            },
          ],
          outputs: [
            {
              receiver: receiverAddress,
              asset: outputAssetAddress,
            },
          ],
          swapType: 'exact-input' as const,
        },
        supportedTypes: ['oif-escrow-v0'],
      };

      const response = await crossChainExecutor.getQuotes(getQuoteRequest);

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
