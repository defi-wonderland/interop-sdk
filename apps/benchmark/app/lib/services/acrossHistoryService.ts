import { FetchHttpClient } from '../http';
import { AcrossDepositsResponseSchema, type AcrossDeposit, type AcrossDepositsResponse } from '../schemas/across';
import type { HistoryService } from '../interfaces/historyService.interface';
import type { HistoryQuery, HistoryResult, HistorySample } from '../types/historyMetrics';
import type { HttpClient } from '@wonderland/interop-cross-chain';
import type { Address } from 'viem';

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
        status: 'filled',
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
  if (deposit.status !== 'filled') return null;
  const decimals = lookupDecimals(tokenDecimals, deposit.originChainId, deposit.inputToken);
  if (decimals === undefined) return null;
  const amountUsd = computeAmountUsd(deposit, decimals);
  if (amountUsd === null) return null;
  const feeUsd = sumFees(deposit);
  if (feeUsd === null) return null;
  return {
    providerId: ACROSS_PROVIDER_ID,
    timestamp: Date.parse(deposit.depositBlockTimestamp),
    amountUsd,
    feeUsd,
    fillTimeSeconds: computeFillTimeSeconds(deposit),
  };
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
  const amount = Number(deposit.inputAmount) / 10 ** decimals;
  const price = Number(deposit.inputPriceUsd);
  if (!Number.isFinite(amount) || !Number.isFinite(price)) return null;
  return amount * price;
}

function sumFees(deposit: AcrossDeposit): number | null {
  const total =
    Number(deposit.bridgeFeeUsd ?? 0) + Number(deposit.fillGasFeeUsd ?? 0) + Number(deposit.swapFeeUsd ?? 0);
  return Number.isFinite(total) ? total : null;
}

function computeFillTimeSeconds(deposit: AcrossDeposit): number | null {
  if (deposit.fillBlockTimestamp === null) return null;
  const depositTs = Date.parse(deposit.depositBlockTimestamp);
  const fillTs = Date.parse(deposit.fillBlockTimestamp);
  if (!Number.isFinite(depositTs) || !Number.isFinite(fillTs)) return null;
  const diff = (fillTs - depositTs) / 1000;
  return diff >= 0 ? diff : null;
}
