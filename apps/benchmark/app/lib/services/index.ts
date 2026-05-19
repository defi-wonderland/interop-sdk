import { aggregator } from '../aggregator';
import { SUPPORTED_CHAINS, SUPPORTED_SYMBOLS } from '../supportedAssets';
import { AcrossHistoryService } from './acrossHistoryService';
import { RelayHistoryService } from './relayHistoryService';
import { SDKChainService } from './sdkChainService';
import { SDKQuoteService } from './sdkQuoteService';
import type { ChainService } from '../interfaces/chainService.interface';
import type { HistoryService } from '../interfaces/historyService.interface';
import type { QuotesService } from '../interfaces/quotesService.interface';

export * from './acrossHistoryService';
export * from './relayHistoryService';
export * from './sdkChainService';
export * from './sdkQuoteService';

export const chainService: ChainService = new SDKChainService(aggregator, SUPPORTED_CHAINS, SUPPORTED_SYMBOLS);
export const quotesService: QuotesService = new SDKQuoteService(aggregator);
export const acrossHistoryService: HistoryService = new AcrossHistoryService();
export const relayHistoryService: HistoryService = new RelayHistoryService();
