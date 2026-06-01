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
    return {
      providerId: quote._providerId,
      protocolName: quote.provider,
      latencyMs: quote.latencyMs,
      eta: quote.eta,
      outputAmount: output?.amount,
      outputAmountUsd: output?.amountUsd,
      outputAssetAddress: output?.assetAddress,
      outputChainId: output?.chainId,
      bridgeFeeUsd: quote.fees?.bridgeFee?.amountUsd,
      originGasUsd: quote.fees?.originGas?.amountUsd,
    };
  }

  private toProviderQuoteError(error: GetQuotesError): ProviderQuoteError {
    return {
      providerId: error.providerId,
      errorMessage: error.errorMsg,
      latencyMs: error.latencyMs,
    };
  }
}
