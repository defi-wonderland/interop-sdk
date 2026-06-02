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

export class RelayHistoryService implements HistoryService {
  constructor(private readonly httpClient: HttpClient = new FetchHttpClient({ baseURL: RELAY_BASE_URL })) {}

  async getHistory(query: HistoryQuery): Promise<HistoryResult> {
    const target = Math.min(query.limit ?? RELAY_DEFAULT_LIMIT, RELAY_MAX_LIMIT);
    const requests = await this.fetchRequests(query, target);
    const filtered = filterByToken(requests, query.tokenAddress);
    const samples = collectSamples(filtered).slice(0, target);
    return { providerId: RELAY_PROVIDER_ID, samples };
  }

  private async fetchRequests(query: HistoryQuery, target: number): Promise<RelayHistoryRequest[]> {
    const collected: RelayHistoryRequest[] = [];
    let usableCount = 0;
    let continuation: string | undefined;
    while (usableCount < target) {
      const page = await this.fetchPage(query, continuation);
      collected.push(...page.requests);
      // Count samples that survive both the token filter and the sample
      // construction step; otherwise dropped requests (subsidized, missing
      // timestamps) leave us under-filling the requested limit.
      usableCount += collectSamples(filterByToken(page.requests, query.tokenAddress)).length;
      // Short page or missing continuation both indicate end of data — stop
      // before issuing a redundant request.
      if (!page.continuation || page.requests.length < RELAY_PAGE_SIZE) break;
      continuation = page.continuation;
    }
    return collected;
  }

  private async fetchPage(query: HistoryQuery, continuation: string | undefined): Promise<RelayHistoryResponse> {
    const { data } = await this.httpClient.get(RELAY_HISTORY_PATH, {
      params: {
        limit: RELAY_PAGE_SIZE,
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
  const components = [fees.gas, fees.fixed, fees.price, fees.gateway];
  // If every fee component is missing, return null instead of summing to $0 —
  // a `$0` reading would be a false positive in the leaderboard.
  if (components.every((value) => value === undefined || value === null)) return null;
  const total = components.reduce<number>((acc, value) => acc + Number(value ?? 0), 0);
  return Number.isFinite(total) ? total : null;
}

function assertNever(value: never): never {
  throw new Error(`Unexpected Relay status: ${String(value)}`);
}
