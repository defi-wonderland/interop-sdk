'use client';

import { useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import { BenchmarkTable } from '../BenchmarkTable';
import { RaceTableRow } from './RaceTableRow';
import { RACE_TABLE_COLUMNS } from './constants';
import { findBestProvider } from './raceRows';
import type { RaceRow } from './types';
import type { NetworkAssets } from '@wonderland/interop-cross-chain';
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
  const firstProviderId = useMemo(() => findBestProvider(rows, 'latency'), [rows]);
  const maxLatencyMs = useMemo(
    () =>
      rows.reduce((max, row) => {
        const latency = row.quote?.latencyMs;
        return latency !== undefined && latency > max ? latency : max;
      }, 0),
    [rows],
  );
  const outputDecimals = lookupOutputDecimals(initialChains, request.toChainId, request.assetSymbol) ?? 6;

  return (
    <section aria-label='live quote race results' className='overflow-hidden border border-border bg-surface'>
      <BenchmarkTable
        columns={RACE_TABLE_COLUMNS}
        rows={rows}
        getRowKey={(row) => row.provider.id}
        renderRow={(row, index) => (
          <RaceTableRow
            row={row}
            rank={row.status === 'settled' ? index + 1 : null}
            outputDecimals={outputDecimals}
            isWinner={row.provider.id === winnerProviderId}
            isFirst={row.provider.id === firstProviderId}
            maxLatencyMs={maxLatencyMs}
            assetSymbol={request.assetSymbol}
            reduceMotion={Boolean(reduceMotion)}
          />
        )}
      />
    </section>
  );
}

function lookupOutputDecimals(chains: NetworkAssets[], chainId: number, symbol: string): number | undefined {
  const network = chains.find((entry) => entry.chainId === chainId);
  const asset = network?.assets.find((entry) => entry.symbol.toUpperCase() === symbol);
  return asset?.decimals;
}
