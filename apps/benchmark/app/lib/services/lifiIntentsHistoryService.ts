import { FetchHttpClient } from '../http';
import {
  LifiIntentsOrdersResponseSchema,
  type LifiIntentsOrderItem,
  type LifiIntentsOrderMeta,
  type LifiIntentsOrdersResponse,
} from '../schemas/lifiIntents';
import type { HistoryService } from '../interfaces/historyService.interface';
import type { HistoryQuery, HistoryResult, HistorySample, HistorySampleStatus } from '../types/historyMetrics';
import type { HttpClient } from '@wonderland/interop-cross-chain';
import type { Address } from 'viem';

const LIFI_INTENTS_BASE_URL = 'https://order.li.fi';
const LIFI_INTENTS_ORDERS_PATH = 'orders';
const LIFI_INTENTS_PROVIDER_ID = 'lifi-intents';
const LIFI_INTENTS_PAGE_SIZE = 50;
const LIFI_INTENTS_DEFAULT_LIMIT = 100;
const LIFI_INTENTS_MAX_LIMIT = 100;

export class LifiIntentsHistoryService implements HistoryService {
  constructor(private readonly httpClient: HttpClient = new FetchHttpClient({ baseURL: LIFI_INTENTS_BASE_URL })) {}

  async getHistory(query: HistoryQuery): Promise<HistoryResult> {
    const items = await this.fetchOrders(query);
    const filtered = filterByToken(items, query.tokenAddress);
    const samples = collectSamples(filtered);
    return { providerId: LIFI_INTENTS_PROVIDER_ID, samples };
  }

  private async fetchOrders(query: HistoryQuery): Promise<LifiIntentsOrderItem[]> {
    const target = Math.min(query.limit ?? LIFI_INTENTS_DEFAULT_LIMIT, LIFI_INTENTS_MAX_LIMIT);
    const collected: LifiIntentsOrderItem[] = [];
    let offset = 0;
    while (collected.length < target) {
      const page = await this.fetchPage(query, target - collected.length, offset);
      if (page.data.length === 0) break;
      collected.push(...page.data);
      offset += page.data.length;
    }
    return collected;
  }

  private async fetchPage(query: HistoryQuery, remaining: number, offset: number): Promise<LifiIntentsOrdersResponse> {
    const { data } = await this.httpClient.get(LIFI_INTENTS_ORDERS_PATH, {
      params: {
        originChainId: query.originChainId,
        destinationChainId: query.destinationChainId,
        limit: Math.min(LIFI_INTENTS_PAGE_SIZE, remaining),
        offset,
      },
    });
    return LifiIntentsOrdersResponseSchema.parse(data);
  }
}

// The Order Server doesn't accept a token filter and `order.inputs` is encoded as LiFi token ids
// (not raw EVM addresses), so we match against the destination `outputs[].token` instead.
function filterByToken(items: LifiIntentsOrderItem[], tokenAddress: Address | undefined): LifiIntentsOrderItem[] {
  if (!tokenAddress) return items;
  const target = tokenAddress.toLowerCase();
  return items.filter((item) => item.order.outputs.some((output) => output.token.toLowerCase() === target));
}

function collectSamples(items: LifiIntentsOrderItem[]): HistorySample[] {
  return items.map(toSample).filter((sample): sample is HistorySample => sample !== null);
}

function toSample(item: LifiIntentsOrderItem): HistorySample | null {
  const timestamp = item.meta.submitTime * 1000;
  if (!Number.isFinite(timestamp)) return null;
  return {
    providerId: LIFI_INTENTS_PROVIDER_ID,
    timestamp,
    status: normalizeStatus(item.meta.orderStatus),
    amountUsd: null,
    feeUsd: null,
    fillTimeSeconds: computeFillTimeSeconds(item.meta),
  };
}

function normalizeStatus(status: string): HistorySampleStatus {
  switch (status) {
    case 'Settled':
    case 'Delivered':
      return 'success';
    case 'Expired':
    case 'Refunded':
    case 'Failed':
      return 'failed';
    default:
      return 'pending';
  }
}

function computeFillTimeSeconds(meta: LifiIntentsOrderMeta): number | null {
  const filledMs = parseTimestampMs(meta.deliveredAt) ?? parseTimestampMs(meta.settledAt);
  if (filledMs === null) return null;
  const diff = filledMs / 1000 - meta.submitTime;
  return diff >= 0 ? diff : null;
}

function parseTimestampMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}
