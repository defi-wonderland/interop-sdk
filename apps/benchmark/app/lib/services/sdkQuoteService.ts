import type { QuotesService } from '../interfaces/quotesService.interface';
import type { ProviderQuoteError, ProviderQuoteResult, QuoteBenchmarkResponse } from '../types/providerQuoteResult';
import type { Aggregator, ExecutableQuote, GetQuotesError, QuoteRequest } from '@wonderland/interop-cross-chain';

export class SDKQuoteService implements QuotesService {
  constructor(private readonly aggregator: Aggregator) {}

  async getQuotes(request: QuoteRequest): Promise<QuoteBenchmarkResponse> {
    const response = await this.aggregator.getQuotes(request);
    return {
      quotes: response.quotes.map((quote) => this.toProviderQuoteResult(quote)),
      errors: response.errors.map((error) => this.toProviderQuoteError(error)),
    };
  }

  private toProviderQuoteResult(quote: ExecutableQuote): ProviderQuoteResult {
    const [output] = quote.preview.outputs;
    const bridgeFeeUsd = quote.fees?.bridgeFee?.amountUsd;
    const originGasUsd = quote.fees?.originGas?.amountUsd;
    return {
      providerId: quote._providerId,
      protocolName: quote.provider,
      latencyMs: quote.latencyMs,
      eta: quote.eta,
      outputAmount: output?.amount,
      outputAmountUsd: output?.amountUsd,
      outputAssetAddress: output?.assetAddress,
      outputChainId: output?.chainId,
      bridgeFeeUsd,
      originGasUsd,
      totalFeeUsd: sumUsd([bridgeFeeUsd, originGasUsd]),
    };
  }

  private toProviderQuoteError(error: GetQuotesError): ProviderQuoteError {
    return {
      errorMessage: error.errorMsg,
      latencyMs: error.latencyMs,
    };
  }
}

function sumUsd(values: (string | undefined)[]): string | undefined {
  const numbers = values
    .map((value) => (value ? Number.parseFloat(value) : Number.NaN))
    .filter((value) => Number.isFinite(value));
  if (numbers.length === 0) return undefined;
  return numbers.reduce((acc, value) => acc + value, 0).toString();
}
