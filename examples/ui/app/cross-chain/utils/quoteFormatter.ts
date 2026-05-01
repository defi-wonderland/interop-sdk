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

function parseFees(quote: ExecutableQuote, inputTokenInfo?: { decimals?: number; symbol?: string }): ParsedFees {
  const fees = quote.fees;
  if (!fees) return DEFAULT_FEES;

  const result: ParsedFees = { hasOriginGas: false };

  if (fees.bridgeFee?.amount && fees.bridgeFee.amount !== '0') {
    const feeDecimals = fees.bridgeFee.token?.decimals ?? inputTokenInfo?.decimals ?? 18;
    result.feeTotal = formatAmount(fees.bridgeFee.amount, feeDecimals);
    result.feeTokenSymbol = fees.bridgeFee.token?.symbol || inputTokenInfo?.symbol || UNKNOWN_TOKEN_SYMBOL;
    if (fees.bridgeFee.amountUsd) result.feeTotalUsd = formatUsdAmount(fees.bridgeFee.amountUsd);
    if (fees.bridgeFeePct) {
      const pctValue = BigInt(fees.bridgeFeePct);
      const wei = 1000000000000000000n;
      result.feePercent = formatPercentage((Number(pctValue) / Number(wei)) * 100);
    }
  }

  if (fees.originGas?.amount && fees.originGas.amount !== '0') {
    result.hasOriginGas = true;
    const gasDecimals = fees.originGas.token?.decimals ?? 18;
    result.originGas = formatAmount(fees.originGas.amount, gasDecimals, 8);
    result.originGasSymbol = fees.originGas.token?.symbol || 'ETH';
    if (fees.originGas.amountUsd) result.originGasUsd = formatUsdAmount(fees.originGas.amountUsd);
  }

  return result;
}

export interface FormattedQuoteData {
  inputAmount: string;
  outputAmount: string;
  inputAmountUsd?: string;
  outputAmountUsd?: string;
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

  const inputAmountUsd = inputPreview?.amountUsd ? formatUsdAmount(inputPreview.amountUsd) : undefined;
  const outputAmountUsd = outputPreview?.amountUsd ? formatUsdAmount(outputPreview.amountUsd) : undefined;

  const eta = quote.eta ? formatETA(quote.eta) : NOT_AVAILABLE;
  const effectiveProviderId = quote._providerId || quote.provider || 'unknown';
  const providerDisplayName = getProviderDisplayName(effectiveProviderId);

  const fees = parseFees(quote, inputTokenInfo);
  const { feeTotal, feeTotalUsd, feePercent, feeTokenSymbol, originGas, originGasUsd, originGasSymbol, hasOriginGas } =
    fees;

  // Check if gas simulation failed (affects whether gas estimates are reliable)
  let gasSimulationFailed = false;
  const metadata = quote.metadata as Record<string, unknown> | undefined;
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
    inputAmountUsd,
    outputAmountUsd,
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
