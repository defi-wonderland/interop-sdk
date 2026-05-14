import { aggregator } from '../aggregator';
import { SDKChainService } from './sdkChainService';
import { SDKQuoteService } from './sdkQuoteService';
import type { ChainService } from '../interfaces/chainService.interface';
import type { QuotesService } from '../interfaces/quotesService.interface';

export * from './sdkChainService';
export * from './sdkQuoteService';

export const chainService: ChainService = new SDKChainService(aggregator);
export const quotesService: QuotesService = new SDKQuoteService(aggregator);
