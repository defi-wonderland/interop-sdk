import { useState, useCallback } from 'react';
import { nameToBinary } from '@wonderland/interop-addresses';
import { crossChainExecutor } from '../services/sdk';
import { convertAmountToSmallestUnit } from '../utils/amountConverter';
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

interface GetQuotesError {
  errorMsg: string;
  error: Error;
}

interface UseQuotesReturn {
  quotes: ExecutableQuote[];
  errors: GetQuotesError[];
  isLoading: boolean;
  fetchQuotes: (params: QuoteParams) => Promise<void>;
  clearQuotes: () => void;
}

export function useQuotes(): UseQuotesReturn {
  const [quotes, setQuotes] = useState<ExecutableQuote[]>([]);
  const [errors, setErrors] = useState<GetQuotesError[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchQuotes = async (params: QuoteParams) => {
    setIsLoading(true);
    setQuotes([]);
    setErrors([]);

    try {
      // Convert amount to smallest unit (wei/smallest unit)
      const amountInSmallestUnit = convertAmountToSmallestUnit(params.inputAmount, params.inputTokenAddress);

      // Convert addresses to EIP-7930 interoperable format
      const [userAddress, inputAssetAddress, receiverAddress, outputAssetAddress] = await Promise.all([
        toInteropAddress(params.sender, params.inputChainId),
        toInteropAddress(params.inputTokenAddress, params.inputChainId),
        toInteropAddress(params.recipient, params.outputChainId),
        toInteropAddress(params.outputTokenAddress, params.outputChainId),
      ]);

      // Convert to OIF GetQuoteRequest format
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
      setErrors([
        {
          errorMsg: 'Failed to fetch quotes',
          error: error instanceof Error ? error : new Error(String(error)),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearQuotes = useCallback(() => {
    setQuotes([]);
    setErrors([]);
  }, []);

  return { quotes, errors, isLoading, fetchQuotes, clearQuotes };
}
