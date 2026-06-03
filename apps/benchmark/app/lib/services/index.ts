import { aggregator } from '../aggregator';
import { TtlCache } from '../caching/ttlCache';
import { SUPPORTED_CHAINS, SUPPORTED_SYMBOLS } from '../supportedAssets';
import { AcrossHistoryService } from './acrossHistoryService';
import { CachingHistoryService } from './cachingHistoryService';
import { LifiIntentsHistoryService } from './lifiIntentsHistoryService';
import { RelayHistoryService } from './relayHistoryService';
import { SDKChainService } from './sdkChainService';
import { SDKQuoteService } from './sdkQuoteService';
import type { ChainService } from '../interfaces/chainService.interface';
import type { HistoryService } from '../interfaces/historyService.interface';
import type { QuotesService } from '../interfaces/quotesService.interface';
import type { HistoryResult } from '../types/historyMetrics';

export * from './acrossHistoryService';
export * from './cachingHistoryService';
export * from './lifiIntentsHistoryService';
export * from './relayHistoryService';
export * from './sdkChainService';
export * from './sdkQuoteService';

const HISTORY_CACHE_TTL_MS = 5 * 60 * 1000;

function withHistoryCache(inner: HistoryService): HistoryService {
  return new CachingHistoryService(inner, new TtlCache<HistoryResult>({ ttlMs: HISTORY_CACHE_TTL_MS }));
}

export const chainService: ChainService = new SDKChainService(aggregator, SUPPORTED_CHAINS, SUPPORTED_SYMBOLS);
export const quotesService: QuotesService = new SDKQuoteService(aggregator);
export const acrossHistoryService: HistoryService = withHistoryCache(new AcrossHistoryService());
export const relayHistoryService: HistoryService = withHistoryCache(new RelayHistoryService());
export const lifiIntentsHistoryService: HistoryService = withHistoryCache(new LifiIntentsHistoryService());
