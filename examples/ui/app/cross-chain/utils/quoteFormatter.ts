import { UNKNOWN_TOKEN_SYMBOL, NOT_AVAILABLE } from '../constants';
import { getProviderDisplayName } from '../services/sdk';
import { formatAmount, formatPercentage, formatETA, formatUsdAmount, formatUsdAmountCompact } from './formatting';
import type { ExecutableQuote, TokenInfo } from '@wonderland/interop-cross-chain';

type ParsedFees = {
  feeTotal?: string;
  feeTotalUsd?: string;
  feePercent?: string;
  feeTokenSymbol?: string;
  originGas?: string;
  originGasUsd?: string;
  originGasSymbol?: string;
  hasOriginGas: boolean;
};

const DEFAULT_FEES: ParsedFees = { hasOriginGas: false };

function parseAcrossFees(
  metadata: Record<string, unknown> | undefined,
  inputTokenInfo?: { decimals?: number; symbol?: string },
): ParsedFees | null {
  if (!metadata?.acrossResponse) return null;

  const acrossResponse = metadata.acrossResponse as {
    fees?: {
      total?: { amount?: string; amountUsd?: string; pct?: string; token?: { symbol?: string; decimals?: number } };
      originGas?: { amount?: string; amountUsd?: string; token?: { symbol?: string; decimals?: number } };
    };
    steps?: {
      bridge?: {
        fees?: { amount?: string; amountUsd?: string; pct?: string; token?: { symbol?: string; decimals?: number } };
      };
    };
  };

  const result: ParsedFees = { hasOriginGas: false };

  const totalFee = acrossResponse.fees?.total;
  const bridgeFee = acrossResponse.steps?.bridge?.fees;
  const feeSource = totalFee?.amount && totalFee.amount !== '0' ? totalFee : bridgeFee?.amount ? bridgeFee : null;

  if (feeSource?.amount && feeSource.amount !== '0') {
    const feeDecimals = feeSource.token?.decimals ?? inputTokenInfo?.decimals ?? 18;
    result.feeTotal = formatAmount(feeSource.amount, feeDecimals);
    result.feeTokenSymbol = feeSource.token?.symbol || inputTokenInfo?.symbol || UNKNOWN_TOKEN_SYMBOL;
    if (feeSource.amountUsd) result.feeTotalUsd = formatUsdAmount(feeSource.amountUsd);
    if (feeSource.pct) {
      const pctValue = BigInt(feeSource.pct);
      const wei = 1000000000000000000n;
      result.feePercent = formatPercentage((Number(pctValue) / Number(wei)) * 100);
    }
  }

  const originGasInfo = acrossResponse.fees?.originGas;
  if (originGasInfo?.amount && originGasInfo.amount !== '0') {
    result.hasOriginGas = true;
    const gasDecimals = originGasInfo.token?.decimals ?? 18;
    result.originGas = formatAmount(originGasInfo.amount, gasDecimals, 8);
    result.originGasSymbol = originGasInfo.token?.symbol || 'ETH';
    if (originGasInfo.amountUsd) result.originGasUsd = formatUsdAmount(originGasInfo.amountUsd);
  }

  return result;
}

function parseRelayFees(
  metadata: Record<string, unknown> | undefined,
  inputTokenInfo?: { decimals?: number; symbol?: string },
): ParsedFees | null {
  if (!metadata?.relayResponse) return null;

  const relayResponse = metadata.relayResponse as {
    fees?: {
      gas?: { amount?: string; amountUsd?: string; currency?: { symbol?: string; decimals?: number } };
      relayer?: { amount?: string; amountUsd?: string; currency?: { symbol?: string; decimals?: number } };
    };
  };

  const result: ParsedFees = { hasOriginGas: false };

  const relayerFee = relayResponse.fees?.relayer;
  if (relayerFee?.amount && relayerFee.amount !== '0') {
    const decimals = relayerFee.currency?.decimals ?? inputTokenInfo?.decimals ?? 18;
    result.feeTotal = formatAmount(relayerFee.amount, decimals);
    result.feeTokenSymbol = relayerFee.currency?.symbol || inputTokenInfo?.symbol || UNKNOWN_TOKEN_SYMBOL;
    if (relayerFee.amountUsd) result.feeTotalUsd = formatUsdAmount(relayerFee.amountUsd);
  }

  const relayGas = relayResponse.fees?.gas;
  if (relayGas?.amount && relayGas.amount !== '0') {
    result.hasOriginGas = true;
    const gasDecimals = relayGas.currency?.decimals ?? 18;
    result.originGas = formatAmount(relayGas.amount, gasDecimals, 8);
    result.originGasSymbol = relayGas.currency?.symbol || 'ETH';
    if (relayGas.amountUsd) result.originGasUsd = formatUsdAmount(relayGas.amountUsd);
  }

  return result;
}

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
  costCompact?: string; // Compact total cost for mobile (e.g. "<$0.01")
}

/**
 * Formats quote data for display
 */
export function formatQuoteData(
  quote: ExecutableQuote,
  inputTokenAddress: string,
  outputTokenAddress: string,
  inputChainId: number,
  outputChainId: number,
  tokenMetadata: Record<number, Record<string, TokenInfo>>,
): FormattedQuoteData {
  const inputTokenInfo = tokenMetadata[inputChainId]?.[inputTokenAddress];
  const outputTokenInfo = tokenMetadata[outputChainId]?.[outputTokenAddress];

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
  const effectiveProviderId = quote._providerId || quote.provider || 'unknown';
  const providerDisplayName = getProviderDisplayName(effectiveProviderId);

  // Extract fee information from metadata (provider-specific structure)
  const metadata = quote.metadata as Record<string, unknown> | undefined;
  const fees = parseAcrossFees(metadata, inputTokenInfo) ?? parseRelayFees(metadata, inputTokenInfo) ?? DEFAULT_FEES;
  const { feeTotal, feeTotalUsd, feePercent, feeTokenSymbol, originGas, originGasUsd, originGasSymbol, hasOriginGas } =
    fees;

  // Check if gas simulation failed (affects whether gas estimates are reliable)
  let gasSimulationFailed = false;

  // Across-specific: check simulationSuccess from metadata
  if (metadata?.simulationSuccess === false) {
    gasSimulationFailed = true;
  }

  const feeNum = feeTotalUsd ? parseFloat(feeTotalUsd.replace('$', '')) : 0;
  const gasNum = originGasUsd ? parseFloat(originGasUsd.replace('$', '')) : 0;
  const totalCost = feeNum + gasNum;
  const costCompact = gasSimulationFailed && totalCost === 0 ? 'gas TBD' : formatUsdAmountCompact(totalCost);

  return {
    inputAmount,
    outputAmount,
    inputSymbol: inputTokenInfo?.symbol || UNKNOWN_TOKEN_SYMBOL,
    outputSymbol: outputTokenInfo?.symbol || UNKNOWN_TOKEN_SYMBOL,
    eta,
    provider: effectiveProviderId,
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
    costCompact,
  };
}
