'use client';

import { useCallback } from 'react';
import { buildQuoteRequest, buildRowsFromQuotes, createRows } from './raceRows';
import type { NetworkAssets } from '@wonderland/interop-cross-chain';
import { useRequestBarStore } from '~/lib/requestBarStore';
import { quotesService } from '~/lib/services';

export function useRunRace(chains: NetworkAssets[]) {
  const setRows = useRequestBarStore((state) => state.setRows);

  return useCallback(async () => {
    if (chains.length === 0) {
      setRows(createRows('errored', 'CHAIN DISCOVERY FAILED'));
      return;
    }

    setRows(createRows('querying'));

    try {
      const { request } = useRequestBarStore.getState();
      const quoteRequest = buildQuoteRequest({ chains, ...request });
      const response = await quotesService.getQuotes(quoteRequest);
      setRows(buildRowsFromQuotes(response.quotes));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'NO ROUTE';
      setRows(createRows('errored', message));
    }
  }, [chains, setRows]);
}
