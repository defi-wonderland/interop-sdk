'use client';

import { useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import { BenchmarkTable } from '../BenchmarkTable';
import { Label } from '../Label';
import { RaceTableRow } from './RaceTableRow';
import { RACE_TABLE_COLUMNS } from './constants';
import { findAsset, findBestProvider, orderRaceRows } from './raceRows';
import type { RaceRow } from './types';
import type { NetworkAssets } from '@wonderland/interop-cross-chain';
import { ASSETS } from '~/lib/assets';
import { CHAINS } from '~/lib/chains';
import { useRequestBarStore } from '~/lib/requestBarStore';

interface RaceTableProps {
  initialRows: RaceRow[];
  initialChains: NetworkAssets[];
}

export function RaceTable({ initialRows, initialChains }: RaceTableProps) {
  const request = useRequestBarStore((state) => state.request);
  const storeRows = useRequestBarStore((state) => state.rows);
  const reduceMotion = useReducedMotion();

  const rows = storeRows.length > 0 ? storeRows : initialRows;

  const winnerProviderId = useMemo(() => findBestProvider(rows, 'output'), [rows]);
  const fastestProviderId = useMemo(() => findBestProvider(rows, 'latency'), [rows]);
  const orderedRows = useMemo(() => orderRaceRows(rows), [rows]);
  const outputDecimals = findAsset(initialChains, request.toChainId, request.assetSymbol)?.decimals ?? 6;

  return (
    <section aria-label='live quote race results' className='overflow-hidden border border-border bg-surface'>
      <div className='border-b border-border-subtle px-4 py-3'>
        <Label className='font-mono text-caption uppercase tracking-widest text-text-muted'>current route</Label>
        <p className='mt-1 font-sans text-xl font-medium tracking-tight text-text-primary'>
          {CHAINS[request.fromChainId].displayName} → {CHAINS[request.toChainId].displayName} ·{' '}
          {ASSETS[request.assetSymbol].displayName}
        </p>
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
