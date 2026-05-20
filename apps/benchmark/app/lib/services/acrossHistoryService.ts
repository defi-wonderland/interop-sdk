import { formatUnits, type Address } from 'viem';
import { FetchHttpClient } from '../http';
import {
  AcrossDepositsResponseSchema,
  type AcrossDeposit,
  type AcrossDepositStatus,
  type AcrossDepositsResponse,
} from '../schemas/across';
import type { HistoryService } from '../interfaces/historyService.interface';
import type { HistoryQuery, HistoryResult, HistorySample, HistorySampleStatus } from '../types/historyMetrics';
import type { HttpClient } from '@wonderland/interop-cross-chain';

const ACROSS_BASE_URL = 'https://app.across.to/api';
const ACROSS_DEPOSITS_PATH = 'deposits';
const ACROSS_PROVIDER_ID = 'across';
const ACROSS_DEPOSITS_DEFAULT_LIMIT = 100;
const ACROSS_DEPOSITS_MAX_LIMIT = 100;

export class AcrossHistoryService implements HistoryService {
  constructor(private readonly httpClient: HttpClient = new FetchHttpClient({ baseURL: ACROSS_BASE_URL })) {}

  async getHistory(query: HistoryQuery): Promise<HistoryResult> {
    const deposits = await this.fetchDeposits(query);
    const filtered = filterByToken(deposits, query.tokenAddress);
    const samples = collectSamples(filtered, query.tokenDecimals ?? {});
    return { providerId: ACROSS_PROVIDER_ID, samples };
  }

  private async fetchDeposits(query: HistoryQuery): Promise<AcrossDepositsResponse> {
    const { data } = await this.httpClient.get(ACROSS_DEPOSITS_PATH, {
      params: {
        originChainId: query.originChainId,
        destinationChainId: query.destinationChainId,
        limit: Math.min(query.limit ?? ACROSS_DEPOSITS_DEFAULT_LIMIT, ACROSS_DEPOSITS_MAX_LIMIT),
      },
    });
    return AcrossDepositsResponseSchema.parse(data);
  }
}

function filterByToken(deposits: AcrossDepositsResponse, tokenAddress: Address | undefined): AcrossDepositsResponse {
  if (!tokenAddress) return deposits;
  const target = tokenAddress.toLowerCase();
  return deposits.filter((deposit) => deposit.inputToken.toLowerCase() === target);
}

function collectSamples(deposits: AcrossDepositsResponse, tokenDecimals: Record<string, number>): HistorySample[] {
  return deposits
    .map((deposit) => toSample(deposit, tokenDecimals))
    .filter((sample): sample is HistorySample => sample !== null);
}

function toSample(deposit: AcrossDeposit, tokenDecimals: Record<string, number>): HistorySample | null {
  const timestamp = Date.parse(deposit.depositBlockTimestamp);
  if (!Number.isFinite(timestamp)) return null;
  const decimals = lookupDecimals(tokenDecimals, deposit.originChainId, deposit.inputToken);
  return {
    providerId: ACROSS_PROVIDER_ID,
    timestamp,
    status: normalizeStatus(deposit.status),
    amountUsd: decimals !== undefined ? computeAmountUsd(deposit, decimals) : null,
    feeUsd: sumFees(deposit),
    fillTimeSeconds: computeFillTimeSeconds(deposit, timestamp),
  };
}

function normalizeStatus(status: AcrossDepositStatus): HistorySampleStatus {
  switch (status) {
    case 'filled':
    case 'slowFilled':
      return 'success';
    case 'expired':
    case 'refunded':
      return 'failed';
    case 'unfilled':
    case 'slowFillRequested':
      return 'pending';
  }
}

function lookupDecimals(
  tokenDecimals: Record<string, number>,
  chainId: number,
  tokenAddress: Address,
): number | undefined {
  return tokenDecimals[tokenKey(chainId, tokenAddress)];
}

function tokenKey(chainId: number, tokenAddress: Address): string {
  return `${chainId}:${tokenAddress.toLowerCase()}`;
}

function computeAmountUsd(deposit: AcrossDeposit, decimals: number): number | null {
  if (deposit.inputPriceUsd === null) return null;
  const price = Number(deposit.inputPriceUsd);
  if (!Number.isFinite(price)) return null;
  const amount = parseBaseUnits(deposit.inputAmount, decimals);
  if (amount === null) return null;
  return amount * price;
}

function parseBaseUnits(raw: string, decimals: number): number | null {
  try {
    const amount = Number(formatUnits(BigInt(raw), decimals));
    return Number.isFinite(amount) ? amount : null;
  } catch {
    return null;
  }
}

function sumFees(deposit: AcrossDeposit): number | null {
  if (deposit.bridgeFeeUsd === null && deposit.fillGasFeeUsd === null && deposit.swapFeeUsd === null) return null;
  const total =
    Number(deposit.bridgeFeeUsd ?? 0) + Number(deposit.fillGasFeeUsd ?? 0) + Number(deposit.swapFeeUsd ?? 0);
  return Number.isFinite(total) ? total : null;
}

function computeFillTimeSeconds(deposit: AcrossDeposit, depositTs: number): number | null {
  if (deposit.fillBlockTimestamp === null) return null;
  const fillTs = Date.parse(deposit.fillBlockTimestamp);
  if (!Number.isFinite(fillTs)) return null;
  const diff = (fillTs - depositTs) / 1000;
  return diff >= 0 ? diff : null;
}
