import { TOKEN_INFO, UNKNOWN_TOKEN_SYMBOL, NOT_AVAILABLE, getProviderDisplayName } from '../constants';
import { formatAmount, formatPercentage, formatETA } from './formatting';
import type { ExecutableQuote } from '@wonderland/interop-cross-chain';

export interface FormattedQuoteData {
  inputAmount: string;
  outputAmount: string;
  inputSymbol: string;
  outputSymbol: string;
  eta: string;
  provider: string;
  providerDisplayName: string;
  feeTotal?: string;
  feePercent?: string;
  feeTokenSymbol?: string;
  gas?: string;
  gasSimulationFailed?: boolean;
}

/**
 * Formats quote data for display
 */
export function formatQuoteData(
  quote: ExecutableQuote,
  inputTokenAddress: string,
  outputTokenAddress: string,
): FormattedQuoteData {
  const inputTokenInfo = TOKEN_INFO[inputTokenAddress];
  const outputTokenInfo = TOKEN_INFO[outputTokenAddress];

  const preview = quote.preview;
  const inputPreview = preview?.inputs?.[0];
  const outputPreview = preview?.outputs?.[0];

  const inputAmount = inputPreview?.amount
    ? formatAmount(inputPreview.amount, inputTokenInfo?.decimals)
    : NOT_AVAILABLE;

  const outputAmount = outputPreview?.amount
    ? formatAmount(outputPreview.amount, outputTokenInfo?.decimals)
    : NOT_AVAILABLE;

  const eta = quote.eta ? formatETA(quote.eta) : NOT_AVAILABLE;
  const provider = quote.provider || '';
  const providerDisplayName = getProviderDisplayName(provider);

  // Extract fee information from metadata (provider-specific structure)
  let feeTotal: string | undefined;
  let feePercent: string | undefined;
  let feeTokenSymbol: string | undefined;

  const metadata = quote.metadata as Record<string, unknown>;
  if (metadata?.acrossResponse) {
    const acrossResponse = metadata.acrossResponse as {
      fees?: {
        total?: {
          amount?: string;
          pct?: string;
          token?: {
            symbol?: string;
            decimals?: number;
          };
        };
      };
    };

    const totalFee = acrossResponse.fees?.total;
    if (totalFee) {
      const feeToken = totalFee.token;
      const feeDecimals = feeToken?.decimals || inputTokenInfo?.decimals || 18;

      if (totalFee.amount) {
        feeTotal = formatAmount(totalFee.amount, feeDecimals);
        feeTokenSymbol = feeToken?.symbol || inputTokenInfo?.symbol || UNKNOWN_TOKEN_SYMBOL;
      }

      if (totalFee.pct) {
        // The pct value is stored in wei format (1e18), representing a decimal fraction
        // Convert to percentage: divide by 1e18 to get decimal, then multiply by 100
        const pctValue = BigInt(totalFee.pct);
        const wei = 1000000000000000000n;
        const percentage = (Number(pctValue) / Number(wei)) * 100;
        feePercent = formatPercentage(percentage);
      }
    }
  }

  // Extract gas information from order payload (only simulated gas, not wallet-specific values)
  let gas: string | undefined;
  let gasSimulationFailed = false;

  const order = quote.order as { payload?: { gas?: string; simulationSuccess?: boolean } };
  if (order?.payload) {
    const payload = order.payload;
    const simulationSuccess = payload.simulationSuccess !== false; // Default to true if not specified

    if (!simulationSuccess) {
      gasSimulationFailed = true;
    } else if (payload.gas && payload.gas !== '0') {
      gas = payload.gas;
    }
  }

  return {
    inputAmount,
    outputAmount,
    inputSymbol: inputTokenInfo?.symbol || UNKNOWN_TOKEN_SYMBOL,
    outputSymbol: outputTokenInfo?.symbol || UNKNOWN_TOKEN_SYMBOL,
    eta,
    provider,
    providerDisplayName,
    feeTotal,
    feePercent,
    feeTokenSymbol,
    gas,
    gasSimulationFailed,
  };
}
