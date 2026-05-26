import { FetchHttpClient } from '../http';
import {
  RelayHistoryResponseSchema,
  type RelayHistoryFeesUsd,
  type RelayHistoryRequest,
  type RelayHistoryResponse,
  type RelayRequestStatus,
} from '../schemas/relay';
import type { HistoryService } from '../interfaces/historyService.interface';
import type { HistoryQuery, HistoryResult, HistorySample, HistorySampleStatus } from '../types/historyMetrics';
import type { HttpClient } from '@wonderland/interop-cross-chain';
import type { Address } from 'viem';

const RELAY_BASE_URL = 'https://api.relay.link';
const RELAY_HISTORY_PATH = 'requests/v2';
const RELAY_PROVIDER_ID = 'relay';
const RELAY_PAGE_SIZE = 50;
const RELAY_DEFAULT_LIMIT = 100;
const RELAY_MAX_LIMIT = 100;
const RELAY_FILTER_SCAN_MULTIPLIER = 5;

export class RelayHistoryService implements HistoryService {
  constructor(private readonly httpClient: HttpClient = new FetchHttpClient({ baseURL: RELAY_BASE_URL })) {}

  async getHistory(query: HistoryQuery): Promise<HistoryResult> {
    const requests = await this.fetchRequests(query);
    const filtered = filterByToken(requests, query.tokenAddress);
    const samples = collectSamples(filtered);
    return { providerId: RELAY_PROVIDER_ID, samples };
  }

  private async fetchRequests(query: HistoryQuery): Promise<RelayHistoryRequest[]> {
    const target = Math.min(query.limit ?? RELAY_DEFAULT_LIMIT, RELAY_MAX_LIMIT);
    const scanCap = query.tokenAddress ? target * RELAY_FILTER_SCAN_MULTIPLIER : target;
    const collected: RelayHistoryRequest[] = [];
    let filteredCount = 0;
    let continuation: string | undefined;
    while (filteredCount < target && collected.length < scanCap) {
      const page = await this.fetchPage(query, scanCap - collected.length, continuation);
      collected.push(...page.requests);
      filteredCount += filterByToken(page.requests, query.tokenAddress).length;
      if (!page.continuation || page.requests.length === 0) break;
      continuation = page.continuation;
    }
    return collected;
  }

  private async fetchPage(
    query: HistoryQuery,
    remaining: number,
    continuation: string | undefined,
  ): Promise<RelayHistoryResponse> {
    const { data } = await this.httpClient.get(RELAY_HISTORY_PATH, {
      params: {
        limit: Math.min(RELAY_PAGE_SIZE, remaining),
        originChainId: query.originChainId,
        destinationChainId: query.destinationChainId,
        continuation,
      },
    });
    return RelayHistoryResponseSchema.parse(data);
  }
}

function filterByToken(requests: RelayHistoryRequest[], tokenAddress: Address | undefined): RelayHistoryRequest[] {
  if (!tokenAddress) return requests;
  const target = tokenAddress.toLowerCase();
  return requests.filter((request) => {
    const address = request.data.metadata?.currencyIn?.currency?.address;
    return typeof address === 'string' && address.toLowerCase() === target;
  });
}

function collectSamples(requests: RelayHistoryRequest[]): HistorySample[] {
  return requests.map((request) => toSample(request)).filter((sample): sample is HistorySample => sample !== null);
}

function toSample(request: RelayHistoryRequest): HistorySample | null {
  if (request.data.subsidizedRequest) return null;
  const inTs = request.data.inTxs?.[0]?.timestamp;
  const outTs = request.data.outTxs?.[0]?.timestamp;
  const timestamp = resolveTimestamp(inTs, request.createdAt);
  if (timestamp === null) return null;
  return {
    providerId: RELAY_PROVIDER_ID,
    timestamp,
    status: normalizeStatus(request.status),
    amountUsd: parseAmountUsd(request.data.metadata?.currencyIn?.amountUsd),
    feeUsd: sumFees(request.data.feesUsd),
    fillTimeSeconds: typeof inTs === 'number' && typeof outTs === 'number' ? Math.max(outTs - inTs, 0) : null,
  };
}

function normalizeStatus(status: RelayRequestStatus): HistorySampleStatus {
  switch (status) {
    case 'success':
      return 'success';
    case 'failure':
    case 'refund':
      return 'failed';
    case 'pending':
    case 'depositing':
    case 'waiting':
      return 'pending';
    default:
      return assertNever(status);
  }
}

function parseAmountUsd(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function resolveTimestamp(inTs: number | undefined, createdAt: string): number | null {
  if (typeof inTs === 'number') return inTs * 1000;
  const parsed = Date.parse(createdAt);
  return Number.isFinite(parsed) ? parsed : null;
}

function sumFees(fees: RelayHistoryFeesUsd | undefined): number | null {
  if (!fees) return null;
  const total = Number(fees.gas ?? 0) + Number(fees.fixed ?? 0) + Number(fees.price ?? 0) + Number(fees.gateway ?? 0);
  return Number.isFinite(total) ? total : null;
}

function assertNever(value: never): never {
  throw new Error(`Unexpected Relay status: ${String(value)}`);
}
