import { formatUnits, isAddressEqual, padHex, toHex, type Address } from 'viem';
import { bytes32ToAddress } from '../helpers';
import { FetchHttpClient } from '../http';
import {
  LifiIntentsOrdersResponseSchema,
  type LifiIntentsOrderItem,
  type LifiIntentsOrderMeta,
  type LifiIntentsOrdersResponse,
} from '../schemas/lifiIntents';
import { DefiLlamaPriceService, priceKey, type PriceCoin, type PriceInfo, type PriceService } from './priceService';
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
    private readonly priceService: PriceService = new DefiLlamaPriceService(),
  ) {}

  async getHistory(query: HistoryQuery): Promise<HistoryResult> {
    const target = Math.min(query.limit ?? LIFI_INTENTS_DEFAULT_LIMIT, LIFI_INTENTS_MAX_LIMIT);
    const items = await this.fetchOrders(query, target);
    const filtered = filterEligibleOrders(items, query.tokenAddress).slice(0, target);
    // Resolve every token price once per call, not per order: the hot per-sample
    // path only reads the resulting map.
    const prices = await this.priceService.getUsdPrices(collectPriceCoins(filtered, query));
    const samples = collectSamples(filtered, query, prices);
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
  const quoted = items.filter((item) => item.quote != null);
  return filterByToken(quoted, tokenAddress);
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

// LiFi encodes the input token as a decimal-string token id (the EVM address as
// a uint). Reuse bytes32ToAddress after padding the hex back to 32 bytes.
function decodeInputToken(item: LifiIntentsOrderItem): Address | null {
  const id = item.order.inputs?.[0]?.[0];
  if (typeof id !== 'string') return null;
  try {
    return bytes32ToAddress(padHex(toHex(BigInt(id)), { size: 32 }));
  } catch {
    return null;
  }
}

function decodeOutputToken(item: LifiIntentsOrderItem): Address | null {
  const token = item.order.outputs[0]?.token;
  return typeof token === 'string' ? bytes32ToAddress(token) : null;
}

function collectPriceCoins(items: LifiIntentsOrderItem[], query: HistoryQuery): PriceCoin[] {
  const coins: PriceCoin[] = [];
  for (const item of items) {
    const input = decodeInputToken(item);
    if (input) coins.push({ chainId: query.originChainId, address: input });
    const output = decodeOutputToken(item);
    if (output) coins.push({ chainId: query.destinationChainId, address: output });
  }
  return coins;
}

function collectSamples(
  items: LifiIntentsOrderItem[],
  query: HistoryQuery,
  prices: Map<string, PriceInfo>,
): HistorySample[] {
  return items
    .map((item) => toSample(item, query, prices))
    .filter((sample): sample is HistorySample => sample !== null);
}

function toSample(
  item: LifiIntentsOrderItem,
  query: HistoryQuery,
  prices: Map<string, PriceInfo>,
): HistorySample | null {
  const timestamp = item.meta.submitTime * 1000;
  if (!Number.isFinite(timestamp)) return null;
  const { amountUsd, feeUsd } = computeUsd(item, query, prices);
  return {
    providerId: LIFI_INTENTS_PROVIDER_ID,
    timestamp,
    status: normalizeStatus(item.meta.orderStatus),
    amountUsd,
    feeUsd,
    fillTimeSeconds: computeFillTimeSeconds(item.meta),
  };
}

interface UsdAmounts {
  amountUsd: number | null;
  feeUsd: number | null;
}

const NO_USD: UsdAmounts = { amountUsd: null, feeUsd: null };

// Effective fee is the input/output spread priced in USD. inUsd is the intent
// size (amountUsd); feeUsd = inUsd - outUsd when both sides resolve to finite
// numbers and the spread is non-negative. Anything missing falls back to nulls.
function computeUsd(item: LifiIntentsOrderItem, query: HistoryQuery, prices: Map<string, PriceInfo>): UsdAmounts {
  const inputToken = decodeInputToken(item);
  const outputToken = decodeOutputToken(item);
  if (!inputToken || !outputToken) return NO_USD;

  const priceIn = prices.get(priceKey(query.originChainId, inputToken));
  const priceOut = prices.get(priceKey(query.destinationChainId, outputToken));

  const inUsd = toUsd(item.quote?.inputAmount, priceIn);
  if (inUsd === null) return NO_USD;

  const outUsd = toUsd(item.quote?.outputAmount, priceOut);
  const feeUsd = outUsd === null ? null : finiteNonNegative(inUsd - outUsd);
  return { amountUsd: inUsd, feeUsd };
}

function toUsd(rawAmount: string | undefined, price: PriceInfo | undefined): number | null {
  if (rawAmount === undefined || price === undefined) return null;
  let units: number;
  try {
    units = Number(formatUnits(BigInt(rawAmount), price.decimals));
  } catch {
    return null;
  }
  const usd = units * price.priceUsd;
  return Number.isFinite(usd) ? usd : null;
}

function finiteNonNegative(value: number): number | null {
  return Number.isFinite(value) && value >= 0 ? value : null;
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
