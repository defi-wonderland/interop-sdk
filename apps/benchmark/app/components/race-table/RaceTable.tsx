'use client';

import { useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { BenchmarkTable } from '../BenchmarkTable';
import { Label } from '../Label';
import { RaceTableRow } from './RaceTableRow';
import { RACE_TABLE_COLUMNS } from './constants';
import {
  buildQuoteRequest,
  buildRowsFromQuotes,
  createRows,
  findAsset,
  findBestProvider,
  orderRaceRows,
} from './raceRows';
import type { RaceRow } from './types';
import type { NetworkAssets } from '@wonderland/interop-cross-chain';
import { ASSETS } from '~/lib/assets';
import { CHAINS } from '~/lib/chains';
import { useRequestBarStore } from '~/lib/requestBarStore';
import { quotesService } from '~/lib/services';

interface RaceTableProps {
  initialChains: NetworkAssets[];
}

export function RaceTable({ initialChains }: RaceTableProps) {
  const request = useRequestBarStore((state) => state.request);
  const runId = useRequestBarStore((state) => state.runId);
  const reduceMotion = useReducedMotion();
  const [rows, setRows] = useState<RaceRow[]>(() =>
    createRows(initialChains.length > 0 ? 'idle' : 'errored', 'CHAIN DISCOVERY FAILED'),
  );

  useEffect(() => {
    if (initialChains.length === 0) {
      setRows(createRows('errored', 'CHAIN DISCOVERY FAILED'));
      return;
    }

    let cancelled = false;
    const requestRun = async () => {
      setRows(createRows('querying'));

      try {
        const currentRequest = useRequestBarStore.getState().request;
        const quoteRequest = buildQuoteRequest({ chains: initialChains, ...currentRequest });
        const response = await quotesService.getQuotes(quoteRequest);
        if (!cancelled) setRows(buildRowsFromQuotes(response.quotes));
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'NO ROUTE';
        setRows(createRows('errored', message));
      }
    };

    void requestRun();

    return () => {
      cancelled = true;
    };
  }, [initialChains, runId]);

  const winnerProviderId = useMemo(() => findBestProvider(rows, 'output'), [rows]);
  const fastestProviderId = useMemo(() => findBestProvider(rows, 'latency'), [rows]);
  const orderedRows = useMemo(() => orderRaceRows(rows), [rows]);
  const outputDecimals = findAsset(initialChains, request.toChainId, request.assetSymbol)?.decimals ?? 6;

  return (
    <section aria-label='live quote race results' className='overflow-hidden border border-border bg-surface'>
      <div className='flex flex-col gap-2 border-b border-border-subtle px-4 py-3 md:flex-row md:items-center md:justify-between'>
        <div>
          <Label className='font-mono text-caption uppercase tracking-widest text-text-muted'>current route</Label>
          <p className='mt-1 font-sans text-xl font-medium tracking-tight text-text-primary'>
            {CHAINS[request.fromChainId].displayName} → {CHAINS[request.toChainId].displayName} ·{' '}
            {ASSETS[request.assetSymbol].displayName}
          </p>
        </div>
        <Label className='font-mono text-label text-text-muted'>run #{runId + 1}</Label>
      </div>

      <BenchmarkTable
        columns={RACE_TABLE_COLUMNS}
        rows={orderedRows}
        getRowKey={(row) => row.provider.id}
        renderRow={(row, index) => (
          <RaceTableRow
            row={row}
            rank={row.status === 'settled' ? index + 1 : null}
            outputDecimals={outputDecimals}
            isWinner={row.provider.id === winnerProviderId}
            isFastest={row.provider.id === fastestProviderId}
            assetSymbol={request.assetSymbol}
            reduceMotion={Boolean(reduceMotion)}
          />
        )}
      />
    </section>
  );
}
