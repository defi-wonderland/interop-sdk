import { aggregator } from '../aggregator';
import { SUPPORTED_CHAINS, SUPPORTED_SYMBOLS } from '../supportedAssets';
import { AcrossHistoryService } from './acrossHistoryService';
import { LifiIntentsHistoryService } from './lifiIntentsHistoryService';
import { RelayHistoryService } from './relayHistoryService';
import { SDKChainService } from './sdkChainService';
import { SDKQuoteService } from './sdkQuoteService';
import type { ChainService } from '../interfaces/chainService.interface';
import type { HistoryService } from '../interfaces/historyService.interface';
import type { QuotesService } from '../interfaces/quotesService.interface';

export * from './acrossHistoryService';
export * from './lifiIntentsHistoryService';
export * from './priceService';
export * from './relayHistoryService';
export * from './sdkChainService';
export * from './sdkQuoteService';

export const chainService: ChainService = new SDKChainService(aggregator, SUPPORTED_CHAINS, SUPPORTED_SYMBOLS);
export const quotesService: QuotesService = new SDKQuoteService(aggregator);
export const acrossHistoryService: HistoryService = new AcrossHistoryService();
export const relayHistoryService: HistoryService = new RelayHistoryService();
export const lifiIntentsHistoryService: HistoryService = new LifiIntentsHistoryService();
