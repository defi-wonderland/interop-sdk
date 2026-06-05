'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChainId } from '~/lib/chains';
import type { ProviderMetrics } from '~/lib/types/historyMetrics';
import { useHeadToHeadRouteStore } from '~/lib/headToHeadRouteStore';

const DEBOUNCE_MS = 300;

export interface HeadToHeadMetricsSeed {
  metrics: ProviderMetrics[];
  fromChainId: ChainId;
  toChainId: ChainId;
  /**
   * True when the SSR fetch failed and `metrics` are null-filled placeholders.
   * Disables the skip-initial-fetch optimization so the client retries
   * instead of sitting on degraded rows.
   */
  isFallback: boolean;
}

export interface HeadToHeadMetricsState {
  metrics: ProviderMetrics[];
  isLoading: boolean;
  error: string | null;
}

interface FetchSuccessPayload {
  metrics: ProviderMetrics[];
}

interface FetchErrorPayload {
  error: string;
}

/**
 * Subscribes to `useHeadToHeadRouteStore` and refetches the head-to-head
 * metrics from `/api/head-to-head-metrics` whenever the from/to chains change.
 * `seed` carries the SSR-computed metrics and the route they correspond to,
 * so first paint isn't a loading skeleton.
 *
 * On mount the fetch is skipped only when the store route matches the seed
 * route AND the seed holds real data. A fallback seed (SSR fetch failed) or a
 * store that boots on a non-seed route (e.g. via persistence) fetches right
 * away instead of showing stale or placeholder data.
 *
 * `assetSymbol` is intentionally NOT a dependency: the history services can
 * already filter by `tokenAddress`, but resolving an asset symbol to its
 * per-chain token address isn't built yet, so we query without a token filter
 * (same as the leaderboard's "ambient activity" query). The picker still
 * updates the displayed dot color; the symbol-to-address resolution lives in
 * a follow-up.
 */
export function useHeadToHeadMetrics(seed: HeadToHeadMetricsSeed): HeadToHeadMetricsState {
  const [state, setState] = useState<HeadToHeadMetricsState>({
    metrics: seed.metrics,
    isLoading: false,
    error: null,
  });

  const fromChainId = useHeadToHeadRouteStore((s) => s.route.fromChainId);
  const toChainId = useHeadToHeadRouteStore((s) => s.route.toChainId);

  const seedRouteRef = useRef({
    fromChainId: seed.fromChainId,
    toChainId: seed.toChainId,
    isFallback: seed.isFallback,
  });
  const skipNextRef = useRef(true);
  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // On the first effect run, skip the fetch only when the store route
    // matches the seed route and the seed is real data. A fallback seed must
    // refetch or the section would sit on placeholder rows until the user
    // changes the route. After this run, every dep change triggers a fetch.
    if (skipNextRef.current) {
      skipNextRef.current = false;
      if (
        !seedRouteRef.current.isFallback &&
        fromChainId === seedRouteRef.current.fromChainId &&
        toChainId === seedRouteRef.current.toChainId
      ) {
        return;
      }
    }

    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    if (abortRef.current !== null) abortRef.current.abort();

    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null;
      const controller = new AbortController();
      abortRef.current = controller;
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const params = new URLSearchParams({
        from: String(fromChainId),
        to: String(toChainId),
      });

      fetch(`/api/head-to-head-metrics?${params}`, { signal: controller.signal })
        .then(async (res) => {
          if (controller.signal.aborted) return;
          if (!res.ok) {
            const payload = (await res.json().catch(() => null)) as FetchErrorPayload | null;
            throw new Error(payload?.error ?? `HTTP ${res.status}`);
          }
          const data = (await res.json()) as FetchSuccessPayload;
          if (controller.signal.aborted) return;
          setState({ metrics: data.metrics, isLoading: false, error: null });
        })
        .catch((err: Error) => {
          // `signal.aborted` also covers aborts that interrupt the body read
          // of a non-OK response, which reject with a plain Error after the
          // inner json() catch swallows the AbortError.
          if (err.name === 'AbortError' || controller.signal.aborted) return;
          setState((prev) => ({ ...prev, isLoading: false, error: err.message }));
        });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (abortRef.current !== null) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, [fromChainId, toChainId]);

  return state;
}
