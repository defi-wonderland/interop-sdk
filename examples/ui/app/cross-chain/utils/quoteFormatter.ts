import { UNKNOWN_TOKEN_SYMBOL, NOT_AVAILABLE } from '../constants';
import { getProviderDisplayName } from '../services/sdk';
import { formatAmount, formatPercentage, formatETA, formatUsdAmount, formatUsdAmountCompact } from './formatting';
import type { ExecutableQuote, TokenInfo } from '@wonderland/interop-cross-chain';

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
  let feeTotal: string | undefined;
  let feeTotalUsd: string | undefined;
  let feePercent: string | undefined;
  let feeTokenSymbol: string | undefined;
  let originGas: string | undefined;
  let originGasUsd: string | undefined;
  let originGasSymbol: string | undefined;
  let hasOriginGas = false;

  const metadata = quote.metadata as Record<string, unknown>;

  // Across and Relay share the same fee structure but use different field names
  // (token vs currency). Normalize both into FeeEntry and use shared parsers.
  interface FeeEntry {
    amount?: string;
    amountUsd?: string;
    decimals?: number;
    symbol?: string;
    pct?: string;
  }

  function parseBridgeFee(entry: FeeEntry | null, fallbackInfo: TokenInfo | undefined): void {
    if (!entry?.amount || entry.amount === '0') return;
    const decimals = entry.decimals || fallbackInfo?.decimals || 18;
    feeTotal = formatAmount(entry.amount, decimals);
    feeTokenSymbol = entry.symbol || fallbackInfo?.symbol || UNKNOWN_TOKEN_SYMBOL;
    if (entry.amountUsd) feeTotalUsd = formatUsdAmount(entry.amountUsd);
    if (entry.pct) {
      const percentage = (Number(BigInt(entry.pct)) / Number(1000000000000000000n)) * 100;
      feePercent = formatPercentage(percentage);
    }
  }

  function parseOriginGas(entry: FeeEntry | null): void {
    if (!entry?.amount || entry.amount === '0') return;
    hasOriginGas = true;
    const decimals = entry.decimals || 18;
    originGas = formatAmount(entry.amount, decimals, 8);
    originGasSymbol = entry.symbol || 'ETH';
    if (entry.amountUsd) originGasUsd = formatUsdAmount(entry.amountUsd);
  }

  if (metadata?.acrossResponse) {
    const across = metadata.acrossResponse as {
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

    const totalFee = across.fees?.total;
    const bridgeFee = across.steps?.bridge?.fees;
    const feeSource = totalFee?.amount && totalFee.amount !== '0' ? totalFee : bridgeFee?.amount ? bridgeFee : null;

    if (feeSource) {
      parseBridgeFee(
        {
          amount: feeSource.amount,
          amountUsd: feeSource.amountUsd,
          pct: feeSource.pct,
          decimals: feeSource.token?.decimals,
          symbol: feeSource.token?.symbol,
        },
        inputTokenInfo,
      );
    }

    const gasInfo = across.fees?.originGas;
    if (gasInfo) {
      parseOriginGas({
        amount: gasInfo.amount,
        amountUsd: gasInfo.amountUsd,
        decimals: gasInfo.token?.decimals,
        symbol: gasInfo.token?.symbol,
      });
    }
  }

  if (metadata?.relayResponse) {
    const relay = metadata.relayResponse as {
      fees?: {
        gas?: { amount?: string; amountUsd?: string; currency?: { symbol?: string; decimals?: number } };
        relayer?: { amount?: string; amountUsd?: string; currency?: { symbol?: string; decimals?: number } };
      };
    };

    const relayerFee = relay.fees?.relayer;
    if (relayerFee) {
      parseBridgeFee(
        {
          amount: relayerFee.amount,
          amountUsd: relayerFee.amountUsd,
          decimals: relayerFee.currency?.decimals,
          symbol: relayerFee.currency?.symbol,
        },
        inputTokenInfo,
      );
    }

    const relayGas = relay.fees?.gas;
    if (relayGas) {
      parseOriginGas({
        amount: relayGas.amount,
        amountUsd: relayGas.amountUsd,
        decimals: relayGas.currency?.decimals,
        symbol: relayGas.currency?.symbol,
      });
    }
  }

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
