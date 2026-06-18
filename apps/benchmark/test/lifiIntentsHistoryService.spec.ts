import { describe, expect, it } from 'vitest';
import { aggregateProviderSamples } from '~/lib/historyAggregation';
import { ProviderId } from '~/lib/providers';
import { LifiIntentsHistoryService } from '~/lib/services/lifiIntentsHistoryService';
import { priceKey, type PriceCoin, type PriceInfo, type PriceService } from '~/lib/services/priceService';
import type { HistoryQuery } from '~/lib/types/historyMetrics';
import type { HttpClient, HttpResponse } from '@wonderland/interop-cross-chain';

const ORIGIN_CHAIN_ID = 8453;
const DESTINATION_CHAIN_ID = 42161;

const INPUT_TOKEN = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
// LiFi encodes the input token as the address read as a uint, in decimal.
const INPUT_TOKEN_ID = BigInt(INPUT_TOKEN).toString();
const OUTPUT_TOKEN = '0xaf88d065e77c8cc2239327c5edb3a432268e5831';
const OUTPUT_TOKEN_BYTES32 = `0x000000000000000000000000${OUTPUT_TOKEN.slice(2)}`;

const QUERY: HistoryQuery = { originChainId: ORIGIN_CHAIN_ID, destinationChainId: DESTINATION_CHAIN_ID };

interface OrderOpts {
  inputAmount?: string;
  outputAmount?: string;
}

function order(opts: OrderOpts = {}): unknown {
  const { inputAmount = '1000000', outputAmount = '900000' } = opts;
  return {
    order: {
      inputs: [[INPUT_TOKEN_ID, inputAmount]],
      outputs: [{ token: OUTPUT_TOKEN_BYTES32 }],
    },
    quote: { inputAmount, outputAmount },
    meta: {
      orderStatus: 'Settled',
      submitTime: 1_700_000_000,
      deliveredAt: '2026-01-01T00:00:30.000Z',
    },
  };
}

function okResponse<T>(data: T): HttpResponse<T> {
  return { status: 200, data, headers: new Headers() };
}

function fakeClient(orders: unknown[]): HttpClient {
  let served = false;
  return {
    async get<T = unknown>(): Promise<HttpResponse<T>> {
      // Serve the snapshot once, then an empty page so pagination terminates.
      const data = served ? { data: [] } : { data: orders };
      served = true;
      return okResponse(data as T);
    },
    async post<T = unknown>(): Promise<HttpResponse<T>> {
      throw new Error('not implemented');
    },
    async request<T = unknown>(): Promise<HttpResponse<T>> {
      throw new Error('not implemented');
    },
  } satisfies HttpClient;
}

function fakePriceService(entries: Record<string, PriceInfo>): { service: PriceService; requested: PriceCoin[][] } {
  const requested: PriceCoin[][] = [];
  const service: PriceService = {
    async getUsdPrices(coins) {
      requested.push(coins);
      const map = new Map<string, PriceInfo>();
      for (const [key, info] of Object.entries(entries)) map.set(key, info);
      return map;
    },
  };
  return { service, requested };
}

const USDC_6_AT_2 = { priceUsd: 2, decimals: 6 } satisfies PriceInfo;

function bothPriced(): Record<string, PriceInfo> {
  return {
    [priceKey(ORIGIN_CHAIN_ID, INPUT_TOKEN)]: USDC_6_AT_2,
    [priceKey(DESTINATION_CHAIN_ID, OUTPUT_TOKEN)]: USDC_6_AT_2,
  };
}

describe('LifiIntentsHistoryService USD pricing', () => {
  it('prices amountUsd from the input side and feeUsd from the input/output spread', async () => {
    // input 1.0 @ $2 = $2; output 0.9 @ $2 = $1.8; fee = $0.2; 0.2/2 = 10%.
    const { service: priceService } = fakePriceService(bothPriced());
    const service = new LifiIntentsHistoryService(fakeClient([order()]), priceService);

    const { samples } = await service.getHistory(QUERY);

    expect(samples).toHaveLength(1);
    expect(samples[0].amountUsd).toBeCloseTo(2, 10);
    expect(samples[0].feeUsd).toBeCloseTo(0.2, 10);

    const metrics = aggregateProviderSamples(ProviderId.Lifi, samples);
    expect(metrics.feePercent).toBeCloseTo(10, 10);
    expect(metrics.volumeUsd).toBeCloseTo(2, 10);
  });

  it('requests both the input and the output token price once', async () => {
    const { service: priceService, requested } = fakePriceService(bothPriced());
    const service = new LifiIntentsHistoryService(fakeClient([order()]), priceService);

    await service.getHistory(QUERY);

    expect(requested).toHaveLength(1);
    expect(requested[0]).toEqual([
      { chainId: ORIGIN_CHAIN_ID, address: INPUT_TOKEN },
      { chainId: DESTINATION_CHAIN_ID, address: OUTPUT_TOKEN },
    ]);
  });

  it('leaves amountUsd and feeUsd null when the input price is missing', async () => {
    // Only the output side is priced, so the intent size can't be valued.
    const { service: priceService } = fakePriceService({
      [priceKey(DESTINATION_CHAIN_ID, OUTPUT_TOKEN)]: USDC_6_AT_2,
    });
    const service = new LifiIntentsHistoryService(fakeClient([order()]), priceService);

    const { samples } = await service.getHistory(QUERY);

    expect(samples[0].amountUsd).toBeNull();
    expect(samples[0].feeUsd).toBeNull();
  });

  it('keeps amountUsd but nulls feeUsd when only the output price is missing', async () => {
    const { service: priceService } = fakePriceService({
      [priceKey(ORIGIN_CHAIN_ID, INPUT_TOKEN)]: USDC_6_AT_2,
    });
    const service = new LifiIntentsHistoryService(fakeClient([order()]), priceService);

    const { samples } = await service.getHistory(QUERY);

    expect(samples[0].amountUsd).toBeCloseTo(2, 10);
    expect(samples[0].feeUsd).toBeNull();
  });

  it('nulls feeUsd on a negative spread (output worth more than input)', async () => {
    // output 1.1 @ $2 = $2.2 > input 1.0 @ $2 = $2 → spread -$0.2, not a fee.
    const { service: priceService } = fakePriceService(bothPriced());
    const service = new LifiIntentsHistoryService(
      fakeClient([order({ inputAmount: '1000000', outputAmount: '1100000' })]),
      priceService,
    );

    const { samples } = await service.getHistory(QUERY);

    expect(samples[0].amountUsd).toBeCloseTo(2, 10);
    expect(samples[0].feeUsd).toBeNull();
  });
});
