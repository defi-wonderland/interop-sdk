import type { QuoteBenchmarkResponse } from '../types/providerQuoteResult';
import type { QuoteRequest } from '@wonderland/interop-cross-chain';

export interface QuotesService {
  getQuotes(request: QuoteRequest): Promise<QuoteBenchmarkResponse>;
}
