import { FetchHttpClient } from '../http';
import { RelayResponseSchema, type RelayFeesUsd, type RelayRequest, type RelayResponse } from '../schemas/relay';
import type { HistoryService } from '../interfaces/historyService.interface';
import type { HistoryQuery, HistoryResult, HistorySample } from '../types/historyMetrics';
import type { HttpClient } from '@wonderland/interop-cross-chain';
import type { Address } from 'viem';

const RELAY_BASE_URL = 'https://api.relay.link';
const RELAY_HISTORY_PATH = 'requests/v2';
const RELAY_PROVIDER_ID = 'relay';
const RELAY_PAGE_SIZE = 50;
const RELAY_DEFAULT_LIMIT = 100;

export class RelayHistoryService implements HistoryService {
  constructor(private readonly httpClient: HttpClient = new FetchHttpClient({ baseURL: RELAY_BASE_URL })) {}

  async getHistory(query: HistoryQuery): Promise<HistoryResult> {
    const requests = await this.fetchRequests(query);
    const filtered = filterByToken(requests, query.tokenAddress);
    const samples = collectSamples(filtered);
    return { providerId: RELAY_PROVIDER_ID, samples };
  }

  private async fetchRequests(query: HistoryQuery): Promise<RelayRequest[]> {
    const target = query.limit ?? RELAY_DEFAULT_LIMIT;
    const collected: RelayRequest[] = [];
    let continuation: string | undefined;
    while (collected.length < target) {
      const page = await this.fetchPage(query, target - collected.length, continuation);
      collected.push(...page.requests);
      if (!page.continuation || page.requests.length === 0) break;
      continuation = page.continuation;
    }
    return collected;
  }

  private async fetchPage(
    query: HistoryQuery,
    remaining: number,
    continuation: string | undefined,
  ): Promise<RelayResponse> {
    const { data } = await this.httpClient.get(RELAY_HISTORY_PATH, {
      params: {
        limit: Math.min(RELAY_PAGE_SIZE, remaining),
        originChainId: query.originChainId,
        destinationChainId: query.destinationChainId,
        continuation,
      },
    });
    return RelayResponseSchema.parse(data);
  }
}

function filterByToken(requests: RelayRequest[], tokenAddress: Address | undefined): RelayRequest[] {
  if (!tokenAddress) return requests;
  const target = tokenAddress.toLowerCase();
  return requests.filter((request) => {
    const address = request.data.metadata?.currencyIn?.currency.address;
    return typeof address === 'string' && address.toLowerCase() === target;
  });
}

function collectSamples(requests: RelayRequest[]): HistorySample[] {
  return requests.map((request) => toSample(request)).filter((sample): sample is HistorySample => sample !== null);
}

function toSample(request: RelayRequest): HistorySample | null {
  if (request.status !== 'success') return null;
  if (request.data.subsidizedRequest) return null;
  const amountUsd = Number(request.data.metadata?.currencyIn?.amountUsd ?? 0);
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) return null;
  const feeUsd = sumFees(request.data.feesUsd);
  if (feeUsd === null) return null;
  const inTs = request.data.inTxs?.[0]?.timestamp;
  const outTs = request.data.outTxs?.[0]?.timestamp;
  return {
    providerId: RELAY_PROVIDER_ID,
    timestamp: typeof inTs === 'number' ? inTs * 1000 : Date.now(),
    amountUsd,
    feeUsd,
    fillTimeSeconds: typeof inTs === 'number' && typeof outTs === 'number' ? Math.max(outTs - inTs, 0) : null,
  };
}

function sumFees(fees: RelayFeesUsd | undefined): number | null {
  if (!fees) return null;
  const total = Number(fees.gas ?? 0) + Number(fees.fixed ?? 0) + Number(fees.price ?? 0) + Number(fees.gateway ?? 0);
  return Number.isFinite(total) ? total : null;
}
