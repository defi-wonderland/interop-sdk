'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { BenchmarkTable } from '../BenchmarkTable';
import { RaceTableRow } from './RaceTableRow';
import { RACE_TABLE_COLUMNS } from './constants';
import { findBestProvider, orderRaceRows } from './raceRows';
import type { RaceRow } from './types';
import type { NetworkAssets } from '@wonderland/interop-cross-chain';
import { useRequestBarStore } from '~/lib/requestBarStore';

// Re-sorts rows to match a known provider order. Used to hold the last settled
// order steady under the loading skeletons. A provider missing from the known
// order sorts after the known ones (rather than jumping to the top) so a
// changed provider set doesn't reshuffle the frozen rows.
function orderByProviderIds(rows: RaceRow[], providerIds: string[]): RaceRow[] {
  if (providerIds.length === 0) return rows;
  const rank = new Map(providerIds.map((id, index) => [id, index]));
  const fallback = providerIds.length;
  return [...rows].sort(
    (left, right) => (rank.get(left.provider.id) ?? fallback) - (rank.get(right.provider.id) ?? fallback),
  );
}

interface RaceTableProps {
  initialRows: RaceRow[];
  initialChains: NetworkAssets[];
}

export function RaceTable({ initialRows, initialChains }: RaceTableProps) {
  const request = useRequestBarStore((state) => state.request);
  const storeRows = useRequestBarStore((state) => state.rows);
  const reduceMotion = useReducedMotion();

  const rawRows = storeRows.length > 0 ? storeRows : initialRows;
  const isLoading = rawRows.some((row) => row.status === 'querying');
  const stableOrder = useRef<string[]>([]);

  // While any row is loading, freeze the order: re-sorting querying rows snaps
  // them to canonical order and then back to winner-first once they settle,
  // which reads as the rows jumping around. Hold the last settled order under
  // the skeletons; only the settled result reorders, once.
  const rows = useMemo(
    () => (isLoading ? orderByProviderIds(rawRows, stableOrder.current) : orderRaceRows(rawRows)),
    [rawRows, isLoading],
  );

  // Remember the settled order after commit (not during render) so the next
  // loading phase can hold it steady without a render-phase side effect.
  useEffect(() => {
    if (!isLoading) stableOrder.current = rows.map((row) => row.provider.id);
  }, [isLoading, rows]);

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
