'use client';

import { useEffect, useRef, useState } from 'react';
import type { ProviderMetrics } from '~/lib/types/historyMetrics';
import { useHeadToHeadRouteStore } from '~/lib/headToHeadRouteStore';

const DEBOUNCE_MS = 300;

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
 * `initialMetrics` is the SSR seed for the canonical route, used so the first
 * paint isn't a loading skeleton.
 *
 * `assetSymbol` is intentionally NOT a dependency: the upstream history APIs
 * are not filtered by asset today (same as the leaderboard's "ambient
 * activity" query). The picker still updates the displayed dot color; wiring
 * asset to the upstream query needs token address resolution per origin chain
 * and lives in a follow-up.
 */
export function useHeadToHeadMetrics(initialMetrics: ProviderMetrics[]): HeadToHeadMetricsState {
  const [state, setState] = useState<HeadToHeadMetricsState>({
    metrics: initialMetrics,
    isLoading: false,
    error: null,
  });

  const fromChainId = useHeadToHeadRouteStore((s) => s.route.fromChainId);
  const toChainId = useHeadToHeadRouteStore((s) => s.route.toChainId);

  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // The SSR seed already covers the initial route, so the first mount must
    // not refetch.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
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
          if (err.name === 'AbortError') return;
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
