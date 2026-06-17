import { describe, expect, it } from 'vitest';
import { DefiLlamaPriceService, priceKey } from '~/lib/services/priceService';
import type { HttpClient, HttpResponse } from '@wonderland/interop-cross-chain';

const USDC_BASE = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
const USDC_ARB = '0xaf88d065e77c8cc2239327c5edb3a432268e5831';

function okResponse<T>(data: T): HttpResponse<T> {
  return { status: 200, data, headers: new Headers() };
}

function fakeClient(handler: (path: string) => unknown): { client: HttpClient; paths: string[] } {
  const paths: string[] = [];
  const client = {
    async get<T = unknown>(path: string): Promise<HttpResponse<T>> {
      paths.push(path);
      return okResponse(handler(path) as T);
    },
    async post<T = unknown>(): Promise<HttpResponse<T>> {
      throw new Error('not implemented');
    },
    async request<T = unknown>(): Promise<HttpResponse<T>> {
      throw new Error('not implemented');
    },
  } satisfies HttpClient;
  return { client, paths };
}

describe('DefiLlamaPriceService', () => {
  it('maps chainId to the llama chain key and lowercases addresses in the request', async () => {
    const { client, paths } = fakeClient(() => ({ coins: {} }));
    const service = new DefiLlamaPriceService(client);

    await service.getUsdPrices([
      { chainId: 8453, address: USDC_BASE.toUpperCase() },
      { chainId: 42161, address: USDC_ARB },
    ]);

    expect(paths).toHaveLength(1);
    expect(paths[0]).toBe(`prices/current/base:${USDC_BASE},arbitrum:${USDC_ARB}`);
  });

  it('parses the response into a chainId:address keyed map', async () => {
    const { client } = fakeClient(() => ({
      coins: {
        [`base:${USDC_BASE}`]: { price: 0.9998, decimals: 6, symbol: 'USDC', confidence: 0.99 },
        [`arbitrum:${USDC_ARB}`]: { price: 1.0001, decimals: 6, symbol: 'USDC', confidence: 0.99 },
      },
    }));
    const service = new DefiLlamaPriceService(client);

    const prices = await service.getUsdPrices([
      { chainId: 8453, address: USDC_BASE },
      { chainId: 42161, address: USDC_ARB },
    ]);

    expect(prices.get(priceKey(8453, USDC_BASE))).toEqual({ priceUsd: 0.9998, decimals: 6 });
    expect(prices.get(priceKey(42161, USDC_ARB))).toEqual({ priceUsd: 1.0001, decimals: 6 });
  });

  it('dedupes identical coins into a single request entry', async () => {
    const { client, paths } = fakeClient(() => ({ coins: {} }));
    const service = new DefiLlamaPriceService(client);

    await service.getUsdPrices([
      { chainId: 8453, address: USDC_BASE },
      { chainId: 8453, address: USDC_BASE.toUpperCase() },
    ]);

    expect(paths[0]).toBe(`prices/current/base:${USDC_BASE}`);
  });

  it('skips coins on chains without a llama mapping', async () => {
    const { client, paths } = fakeClient(() => ({ coins: {} }));
    const service = new DefiLlamaPriceService(client);

    const prices = await service.getUsdPrices([{ chainId: 999999, address: USDC_BASE }]);

    expect(paths).toHaveLength(0);
    expect(prices.size).toBe(0);
  });

  it('returns an empty map when the request throws', async () => {
    const client = {
      async get(): Promise<never> {
        throw new Error('network down');
      },
      async post(): Promise<never> {
        throw new Error('not implemented');
      },
      async request(): Promise<never> {
        throw new Error('not implemented');
      },
    } satisfies HttpClient;
    const service = new DefiLlamaPriceService(client);

    const prices = await service.getUsdPrices([{ chainId: 8453, address: USDC_BASE }]);

    expect(prices.size).toBe(0);
  });

  it('drops entries the source cannot price', async () => {
    const { client } = fakeClient(() => ({
      coins: { [`base:${USDC_BASE}`]: { symbol: 'USDC' } },
    }));
    const service = new DefiLlamaPriceService(client);

    const prices = await service.getUsdPrices([{ chainId: 8453, address: USDC_BASE }]);

    expect(prices.size).toBe(0);
  });
});
