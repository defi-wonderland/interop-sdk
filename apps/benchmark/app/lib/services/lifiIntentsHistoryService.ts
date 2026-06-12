import { isAddressEqual, type Address } from 'viem';
import { bytes32ToAddress } from '../helpers';
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

const LIFI_INTENTS_BASE_URL = 'https://order.li.fi';
const LIFI_INTENTS_ORDERS_PATH = 'orders';
const LIFI_INTENTS_PROVIDER_ID = 'lifi-intents';
const LIFI_INTENTS_PAGE_SIZE = 50;
const LIFI_INTENTS_DEFAULT_LIMIT = 100;
const LIFI_INTENTS_MAX_LIMIT = 100;
const LIFI_INTENTS_REQUEST_TIMEOUT_MS = 15_000;

export class LifiIntentsHistoryService implements HistoryService {
  constructor(
    private readonly httpClient: HttpClient = new FetchHttpClient({
      baseURL: LIFI_INTENTS_BASE_URL,
      timeout: LIFI_INTENTS_REQUEST_TIMEOUT_MS,
    }),
  ) {}

  async getHistory(query: HistoryQuery): Promise<HistoryResult> {
    const target = Math.min(query.limit ?? LIFI_INTENTS_DEFAULT_LIMIT, LIFI_INTENTS_MAX_LIMIT);
    const items = await this.fetchOrders(query, target);
    const filtered = filterEligibleOrders(items, query.tokenAddress);
    const samples = collectSamples(filtered).slice(0, target);
    return { providerId: LIFI_INTENTS_PROVIDER_ID, samples };
  }

  private async fetchOrders(query: HistoryQuery, target: number): Promise<LifiIntentsOrderItem[]> {
    const collected: LifiIntentsOrderItem[] = [];
    let filteredCount = 0;
    let offset = 0;
    while (filteredCount < target) {
      const page = await this.fetchPage(query, offset);
      if (page.data.length === 0) break;
      collected.push(...page.data);
      filteredCount += filterEligibleOrders(page.data, query.tokenAddress).length;
      offset += page.data.length;
      if (page.data.length < LIFI_INTENTS_PAGE_SIZE) break;
    }
    return collected;
  }

  private async fetchPage(query: HistoryQuery, offset: number): Promise<LifiIntentsOrdersResponse> {
    const { data } = await this.httpClient.get(LIFI_INTENTS_ORDERS_PATH, {
      params: {
        originChainId: query.originChainId,
        destinationChainId: query.destinationChainId,
        limit: LIFI_INTENTS_PAGE_SIZE,
        offset,
      },
    });
    return LifiIntentsOrdersResponseSchema.parse(data);
  }
}

// Orders submitted without a solver quote don't go through the quote -> submit flow the SDK
// integrates, and they fail at ~30% (vs ~0.5% for quoted ones), so they're excluded from the sample.
function filterEligibleOrders(
  items: LifiIntentsOrderItem[],
  tokenAddress: Address | undefined,
): LifiIntentsOrderItem[] {
  return filterByToken(items, tokenAddress).filter((item) => item.quote != null);
}

// The Order Server doesn't accept a token filter and `order.inputs` is encoded as LiFi token ids
// (not raw EVM addresses), so we match against the destination `outputs[].token` instead.
function filterByToken(items: LifiIntentsOrderItem[], tokenAddress: Address | undefined): LifiIntentsOrderItem[] {
  if (!tokenAddress) return items;
  return items.filter((item) =>
    item.order.outputs.some((output) => {
      const address = bytes32ToAddress(output.token);
      return address !== null && isAddressEqual(address, tokenAddress);
    }),
  );
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
