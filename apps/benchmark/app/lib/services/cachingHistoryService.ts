import type { AsyncCache } from '../interfaces/asyncCache.interface';
import type { HistoryService } from '../interfaces/historyService.interface';
import type { HistoryQuery, HistoryResult } from '../types/historyMetrics';

export function buildHistoryCacheKey(query: HistoryQuery): string {
  const token = query.tokenAddress?.toLowerCase() ?? 'any';
  const limit = query.limit ?? 'default';
  const tokenDecimals = query.tokenDecimals;
  const decimals = tokenDecimals
    ? Object.keys(tokenDecimals)
        .sort()
        .map((key) => `${key}=${tokenDecimals[key]}`)
        .join(',')
    : 'default';
  return `${query.originChainId}->${query.destinationChainId}|token=${token}|limit=${limit}|decimals=${decimals}`;
}

export class CachingHistoryService implements HistoryService {
  constructor(
    private readonly inner: HistoryService,
    private readonly cache: AsyncCache<HistoryResult>,
  ) {}

  getHistory(query: HistoryQuery): Promise<HistoryResult> {
    return this.cache.getOrLoad(buildHistoryCacheKey(query), () => this.inner.getHistory(query));
  }
}
