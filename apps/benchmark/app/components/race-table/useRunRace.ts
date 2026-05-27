'use client';

import { useCallback } from 'react';
import { buildQuoteRequest, buildRowsFromQuotes, createRows, orderRaceRows } from './raceRows';
import type { RaceRow } from './types';
import type { NetworkAssets } from '@wonderland/interop-cross-chain';
import { useRequestBarStore } from '~/lib/requestBarStore';
import { quotesService } from '~/lib/services';

export function useRunRace(chains: NetworkAssets[]) {
  const setRows = useRequestBarStore((state) => state.setRows);

  return useCallback(async () => {
    if (chains.length === 0) {
      setRows(orderRaceRows(createRows('errored', 'CHAIN DISCOVERY FAILED')));
      return;
    }

    setRows(toQueryingRows(useRequestBarStore.getState().rows));

    try {
      const { request } = useRequestBarStore.getState();
      const quoteRequest = buildQuoteRequest({ chains, ...request });
      const response = await quotesService.getQuotes(quoteRequest);
      setRows(orderRaceRows(buildRowsFromQuotes(response.quotes)));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'NO ROUTE';
      setRows(orderRaceRows(createRows('errored', message)));
    }
  }, [chains, setRows]);
}

function toQueryingRows(previous: RaceRow[]): RaceRow[] {
  if (previous.length === 0) return createRows('querying');
  return previous.map((row) => ({ provider: row.provider, status: 'querying' as const }));
}
