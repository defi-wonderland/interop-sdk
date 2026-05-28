'use client';

import { useCallback, useRef } from 'react';
import { buildQuoteRequest, buildRowsFromQuotes, createRows, orderRaceRows } from './raceRows';
import type { RaceRow } from './types';
import type { NetworkAssets } from '@wonderland/interop-cross-chain';
import { useRequestBarStore } from '~/lib/requestBarStore';
import { quotesService } from '~/lib/services';

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
      const quoteRequest = buildQuoteRequest({ chains, ...request });
      const response = await Promise.race([quotesService.getQuotes(quoteRequest), rejectAfter(RACE_TIMEOUT_MS)]);
      if (runId !== latestRunId.current) return;
      setRows(orderRaceRows(buildRowsFromQuotes(response.quotes)));
    } catch (error) {
      if (runId !== latestRunId.current) return;
      const message = error instanceof Error ? error.message : 'NO ROUTE';
      setRows(orderRaceRows(createRows('errored', message)));
    }
  }, [chains, setRows]);
}

function toQueryingRows(previous: RaceRow[]): RaceRow[] {
  if (previous.length === 0) return createRows('querying');
  return previous.map((row) => ({ provider: row.provider, status: 'querying' as const }));
}

function rejectAfter(ms: number): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms));
}
