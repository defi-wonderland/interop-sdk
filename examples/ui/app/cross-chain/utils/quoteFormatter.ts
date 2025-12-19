import { TOKEN_INFO, UNKNOWN_TOKEN_SYMBOL, NOT_AVAILABLE, getProviderDisplayName } from '../constants';
import { formatAmount, formatPercentage, formatETA, formatUsdAmount } from './formatting';
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
  feeTotalUsd?: string;
  feePercent?: string;
  feeTokenSymbol?: string;
  originGas?: string;
  originGasUsd?: string;
  originGasSymbol?: string;
  hasOriginGas?: boolean; // True if originGas is present and non-zero (even if formatted value rounds to 0)
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
  let feeTotalUsd: string | undefined;
  let feePercent: string | undefined;
  let feeTokenSymbol: string | undefined;
  let originGas: string | undefined;
  let originGasUsd: string | undefined;
  let originGasSymbol: string | undefined;
  let hasOriginGas = false;

  const metadata = quote.metadata as Record<string, unknown>;
  if (metadata?.acrossResponse) {
    const acrossResponse = metadata.acrossResponse as {
      fees?: {
        total?: {
          amount?: string;
          amountUsd?: string;
          pct?: string;
          token?: {
            symbol?: string;
            decimals?: number;
          };
        };
        originGas?: {
          amount?: string;
          amountUsd?: string;
          token?: {
            symbol?: string;
            decimals?: number;
          };
        };
      };
      steps?: {
        bridge?: {
          fees?: {
            amount?: string;
            amountUsd?: string;
            pct?: string;
            token?: {
              symbol?: string;
              decimals?: number;
            };
          };
        };
      };
    };

    // Try fees.total first, fallback to steps.bridge.fees if total is 0 or missing
    const totalFee = acrossResponse.fees?.total;
    const bridgeFee = acrossResponse.steps?.bridge?.fees;

    // Use totalFee if amount is non-zero, otherwise try bridgeFee
    const feeSource = totalFee?.amount && totalFee.amount !== '0' ? totalFee : bridgeFee?.amount ? bridgeFee : null;

    if (feeSource) {
      const feeToken = feeSource.token;
      const feeDecimals = feeToken?.decimals || inputTokenInfo?.decimals || 18;

      if (feeSource.amount && feeSource.amount !== '0') {
        feeTotal = formatAmount(feeSource.amount, feeDecimals);
        feeTokenSymbol = feeToken?.symbol || inputTokenInfo?.symbol || UNKNOWN_TOKEN_SYMBOL;
      }

      // Extract USD value for fee
      if (feeSource.amountUsd) {
        feeTotalUsd = formatUsdAmount(feeSource.amountUsd);
      }

      if (feeSource.pct) {
        // The pct value is stored in wei format (1e18), representing a decimal fraction
        // Convert to percentage: divide by 1e18 to get decimal, then multiply by 100
        const pctValue = BigInt(feeSource.pct);
        const wei = 1000000000000000000n;
        const percentage = (Number(pctValue) / Number(wei)) * 100;
        feePercent = formatPercentage(percentage);
      }
    }

    // Extract origin gas (paid by user on source chain)
    const originGasInfo = acrossResponse.fees?.originGas;
    if (originGasInfo?.amount && originGasInfo.amount !== '0') {
      hasOriginGas = true; // Track that gas is present even if formatted value rounds to 0
      const gasDecimals = originGasInfo.token?.decimals || 18;
      // Use more decimal places for gas (8) since ETH gas costs can be very small
      originGas = formatAmount(originGasInfo.amount, gasDecimals, 8);
      originGasSymbol = originGasInfo.token?.symbol || 'ETH';

      // Extract USD value for gas
      if (originGasInfo.amountUsd) {
        originGasUsd = formatUsdAmount(originGasInfo.amountUsd);
      }
    }
  }

  // Check if gas simulation failed (affects whether gas estimates are reliable)
  let gasSimulationFailed = false;

  const order = quote.order as { payload?: { simulationSuccess?: boolean } };
  if (order?.payload) {
    const simulationSuccess = order.payload.simulationSuccess !== false; // Default to true if not specified
    if (!simulationSuccess) {
      gasSimulationFailed = true;
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
    feeTotalUsd,
    feePercent,
    feeTokenSymbol,
    originGas,
    originGasUsd,
    originGasSymbol,
    hasOriginGas,
    gasSimulationFailed,
  };
}
