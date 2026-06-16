import { afterEach, describe, expect, it, vi } from 'vitest';
import { aggregateProviderSamples } from '~/lib/historyAggregation';
import { ProviderId } from '~/lib/providers';
import {
  aggregateProviderRoutes,
  allProvidersFailed,
  emptyProviderMetrics,
  fetchAggregatedProviderMetrics,
} from '~/lib/services/providerMetrics';
import type { HistoryService } from '~/lib/interfaces/historyService.interface';
import type { HistoryQuery, HistoryResult, HistorySample } from '~/lib/types/historyMetrics';

// Mock the services barrel so importing providerMetrics doesn't construct the
// real SDK aggregator / history clients. Each fake answers with an empty (but
// resolved) feed; the fan-out logic under test injects its own services.
vi.mock('~/lib/services', () => ({
  acrossHistoryService: { getHistory: async () => ({ providerId: 'across', samples: [] }) },
  relayHistoryService: { getHistory: async () => ({ providerId: 'relay', samples: [] }) },
  lifiIntentsHistoryService: { getHistory: async () => ({ providerId: 'lifi-intents', samples: [] }) },
}));

const NEVER = Number.MAX_SAFE_INTEGER;

function fills(id: ProviderId, n: number, over: Partial<HistorySample> = {}): HistorySample[] {
  return Array.from({ length: n }, () => ({
    providerId: id,
    timestamp: 0,
    status: 'success' as const,
    amountUsd: 100,
    feeUsd: 2,
    fillTimeSeconds: 12,
    ...over,
  }));
}

function result(id: ProviderId, samples: HistorySample[]): HistoryResult {
  return { providerId: id, samples };
}

// A single success fill at a given timestamp (ms), for sample-window assertions.
function at(timestamp: number): HistorySample {
  return {
    providerId: ProviderId.Across,
    timestamp,
    status: 'success',
    amountUsd: 100,
    feeUsd: 2,
    fillTimeSeconds: 12,
  };
}

type RouteHandler = (query: HistoryQuery, callIndex: number) => HistoryResult;

function fakeService(handler: RouteHandler): { service: HistoryService; calls: HistoryQuery[] } {
  const calls: HistoryQuery[] = [];
  const service: HistoryService = {
    async getHistory(query) {
      const index = calls.length;
      calls.push(query);
      return handler(query, index);
    },
  };
  return { service, calls };
}

function routes(n: number): HistoryQuery[] {
  return Array.from({ length: n }, (_, i) => ({ originChainId: i + 1, destinationChainId: 1000 + i }));
}

const ACROSS = ProviderId.Across;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('aggregateProviderSamples feePercent', () => {
  function sample(over: Partial<HistorySample>): HistorySample {
    return {
      providerId: ACROSS,
      timestamp: 0,
      status: 'success',
      amountUsd: 100,
      feeUsd: 2,
      fillTimeSeconds: 12,
      ...over,
    };
  }

  it('takes the median of per-sample fee percents', () => {
    // 1%, 2%, 6% → median 2%
    const samples = [
      sample({ feeUsd: 1, amountUsd: 100 }),
      sample({ feeUsd: 2, amountUsd: 100 }),
      sample({ feeUsd: 6, amountUsd: 100 }),
    ];

    expect(aggregateProviderSamples(ACROSS, samples).feePercent).toBe(2);
  });

  it('drops negative-fee samples (Across swap-surplus) from the median', () => {
    // The -5 sample would pull a mean negative; dropped, the median is 2%.
    const samples = [
      sample({ feeUsd: -5, amountUsd: 100 }),
      sample({ feeUsd: 1, amountUsd: 100 }),
      sample({ feeUsd: 3, amountUsd: 100 }),
    ];

    expect(aggregateProviderSamples(ACROSS, samples).feePercent).toBe(2);
  });

  it('is null when no sample has both a fee and a size', () => {
    const samples = [
      sample({ feeUsd: null, amountUsd: 100 }),
      sample({ feeUsd: 2, amountUsd: null }),
      sample({ feeUsd: 2, amountUsd: 0 }),
    ];

    expect(aggregateProviderSamples(ACROSS, samples).feePercent).toBeNull();
  });
});

describe('aggregateProviderRoutes', () => {
  it('pools samples across every route and aggregates the combined pool once', async () => {
    // Routes return 1, 2, 3 fills: a per-route aggregate would never see 6.
    const { service, calls } = fakeService((_q, i) => result(ACROSS, fills(ACROSS, [1, 2, 3][i])));

    const metrics = await aggregateProviderRoutes(ACROSS, service, routes(3), NEVER);

    expect(calls).toHaveLength(3);
    expect(metrics.fillCount).toBe(6);
    expect(metrics.successRate).toBe(1);
    expect(metrics.p50FillSeconds).toBe(12);
    expect(metrics.p99FillSeconds).toBe(12);
    expect(metrics.feePercent).toBe(2); // feeUsd 2 / amountUsd 100 = 2%
    expect(metrics.volumeUsd).toBe(600);
  });

  it('drops a failed route and still aggregates the rest', async () => {
    const { service } = fakeService((_q, i) => {
      if (i === 1) throw new Error('route blew up');
      return result(ACROSS, fills(ACROSS, 2));
    });

    const metrics = await aggregateProviderRoutes(ACROSS, service, routes(3), NEVER);

    expect(metrics.fillCount).toBe(4); // two surviving routes, two fills each
    expect(metrics.successRate).toBe(1);
  });

  it('returns a null row when every route fails', async () => {
    const { service } = fakeService(() => {
      throw new Error('provider down');
    });

    const metrics = await aggregateProviderRoutes(ACROSS, service, routes(3), NEVER);

    expect(metrics.fillCount).toBeNull();
    expect(metrics.successRate).toBeNull();
    expect(metrics.p50FillSeconds).toBeNull();
  });

  it('keeps a real zero-fill answer as a row, not a null fallback', async () => {
    const { service } = fakeService(() => result(ACROSS, []));

    const metrics = await aggregateProviderRoutes(ACROSS, service, routes(3), NEVER);

    expect(metrics.fillCount).toBe(0); // the provider answered, just with nothing
    expect(metrics.successRate).toBeNull(); // no resolved samples to rate
    expect(metrics.sampleWindowSeconds).toBeNull(); // no fills, no span
  });

  it('reports the sample window as the span from oldest to newest fill across routes', async () => {
    const { service } = fakeService((_q, i) =>
      result(ACROSS, i === 0 ? [at(0), at(3_600_000)] : [at(7_200_000), at(10_800_000)]),
    );

    const metrics = await aggregateProviderRoutes(ACROSS, service, routes(2), NEVER);

    expect(metrics.fillCount).toBe(4);
    expect(metrics.sampleWindowSeconds).toBe(10_800); // 0 → 3h, pooled across both routes
  });

  it('has no window when the pool holds a single fill', async () => {
    const { service } = fakeService((_q, i) => result(ACROSS, i === 0 ? [at(0)] : []));

    const metrics = await aggregateProviderRoutes(ACROSS, service, routes(2), NEVER);

    expect(metrics.fillCount).toBe(1);
    expect(metrics.sampleWindowSeconds).toBeNull();
  });

  it('launches no waves when the budget is already spent', async () => {
    const { service, calls } = fakeService(() => result(ACROSS, fills(ACROSS, 5)));

    const metrics = await aggregateProviderRoutes(ACROSS, service, routes(6), 0);

    expect(calls).toHaveLength(0);
    expect(metrics.fillCount).toBeNull();
  });

  it('stops launching waves once the budget passes, keeping the partial pool', async () => {
    const t0 = 1_000_000;
    // First wave's pre-check sees time before the deadline; every later check is past it.
    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(t0)
      .mockReturnValue(t0 + 10_000);
    const { service, calls } = fakeService(() => result(ACROSS, fills(ACROSS, 1)));

    const metrics = await aggregateProviderRoutes(ACROSS, service, routes(9), t0 + 1_000);

    expect(calls.length).toBeGreaterThan(0);
    expect(calls.length).toBeLessThan(9); // it stopped before draining every route
    expect(metrics.fillCount).toBe(calls.length); // partial pool survives, not null
  });
});

describe('fetchAggregatedProviderMetrics', () => {
  it('returns one row per feed provider in order and appends the Bungee placeholder', async () => {
    const metrics = await fetchAggregatedProviderMetrics(routes(2));

    expect(metrics.map((row) => row.providerId)).toEqual([
      ProviderId.Across,
      ProviderId.Relay,
      ProviderId.Lifi,
      ProviderId.Bungee,
    ]);
    // Feeds answered (empty but resolved) → real zero rows; Bungee has no feed → null.
    expect(metrics.slice(0, 3).every((row) => row.fillCount === 0)).toBe(true);
    expect(metrics[3].fillCount).toBeNull();
  });
});

describe('allProvidersFailed', () => {
  it('is true only when every row is null-filled', () => {
    expect(allProvidersFailed(emptyProviderMetrics())).toBe(true);
  });

  it('is false when a provider answered with zero fills', () => {
    const rows = emptyProviderMetrics();
    rows[0] = { ...rows[0], fillCount: 0 };
    expect(allProvidersFailed(rows)).toBe(false);
  });

  it('is false when any provider has data', () => {
    const rows = emptyProviderMetrics();
    rows[0] = { ...rows[0], fillCount: 5 };
    expect(allProvidersFailed(rows)).toBe(false);
  });
});

describe('emptyProviderMetrics', () => {
  it('returns a null row per feed provider plus Bungee', () => {
    const rows = emptyProviderMetrics();

    expect(rows.map((row) => row.providerId)).toEqual([
      ProviderId.Across,
      ProviderId.Relay,
      ProviderId.Lifi,
      ProviderId.Bungee,
    ]);
    expect(rows.every((row) => row.fillCount === null)).toBe(true);
  });

  it('returns fresh objects each call so callers can mutate safely', () => {
    expect(emptyProviderMetrics()[0]).not.toBe(emptyProviderMetrics()[0]);
  });
});
