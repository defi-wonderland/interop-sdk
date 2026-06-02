import type { HistoryQuery, HistoryResult } from '../types/historyMetrics';

export interface HistoryService {
  getHistory(query: HistoryQuery): Promise<HistoryResult>;
}
