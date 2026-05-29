'use client';

import { useCallback, useRef } from 'react';
import { buildRowsFromQuotes, createRows, orderRaceRows } from './raceRows';
import type { RaceRow } from './types';
import type { NetworkAssets } from '@wonderland/interop-cross-chain';
import type { QuoteBenchmarkResponse } from '~/lib/types';
import { withTimeout } from '~/lib/helpers';
import { useRequestBarStore } from '~/lib/requestBarStore';

const RACE_TIMEOUT_MS = 30_000;

export function useRunRace(chains: NetworkAssets[]) {
  const setRows = useRequestBarStore((state) => state.setRows);
  const latestRunId = useRef(0);

  return useCallback(async () => {
    if (chains.length === 0) {
      setRows(orderRaceRows(createRows('errored', 'CHAIN DISCOVERY FAILED')));
      return;
    }

    latestRunId.current += 1;
    const runId = latestRunId.current;
    setRows(toQueryingRows(useRequestBarStore.getState().rows));

    try {
      const { request } = useRequestBarStore.getState();
      const query = new URLSearchParams({
        fromChainId: String(request.fromChainId),
        toChainId: String(request.toChainId),
        assetSymbol: request.assetSymbol,
        amount: request.amount,
      });
      const response = await withTimeout(fetch(`/api/race-quotes?${query.toString()}`), RACE_TIMEOUT_MS);

      if (runId !== latestRunId.current) return;

      if (response.status === 429) {
        setRows(orderRaceRows(createRows('errored', 'RATE LIMITED')));
        return;
      }

      if (!response.ok) {
        const message = await readErrorMessage(response);
        if (runId !== latestRunId.current) return;
        setRows(orderRaceRows(createRows('errored', message)));
        return;
      }

      const payload = (await response.json()) as QuoteBenchmarkResponse;
      // A newer run can fire while we await the JSON body. Re-check before
      // we publish rows so stale responses can't overwrite fresh ones.
      if (runId !== latestRunId.current) return;
      setRows(orderRaceRows(buildRowsFromQuotes(payload.quotes, payload.errors)));
    } catch (error) {
      if (runId !== latestRunId.current) return;
      const message = error instanceof Error ? error.message : 'NO ROUTE';
      setRows(orderRaceRows(createRows('errored', message)));
    }
  }, [chains, setRows]);
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? 'NO ROUTE';
  } catch {
    return 'NO ROUTE';
  }
}

function toQueryingRows(previous: RaceRow[]): RaceRow[] {
  if (previous.length === 0) return createRows('querying');
  return previous.map((row) => ({ provider: row.provider, status: 'querying' as const }));
}
