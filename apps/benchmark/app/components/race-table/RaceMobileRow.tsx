'use client';

import { motion } from 'framer-motion';
import { Skeleton } from '../Skeleton';
import { ProviderChip } from '../mobile/ProviderChip';
import { RaceStatusPill } from './RaceStatusPill';
import type { RaceRow } from './types';
import { AssetSymbol } from '~/lib/assets';
import { cn } from '~/lib/cn';
import { formatEta, formatLatency, formatTokenAmount } from '~/lib/formatters';

interface RaceMobileRowProps {
  row: RaceRow;
  rank: number | null;
  outputDecimals: number;
  isWinner: boolean;
  isFirst: boolean;
  assetSymbol: AssetSymbol;
  reduceMotion: boolean;
}

// Mobile race row: rank + provider on the left, output amount + status pill on
// the right, with a mono latency/eta subline under the provider. Compact row,
// not a stat grid. Winner row is tinted; querying rows mirror the desktop
// skeleton treatment.
export function RaceMobileRow({
  row,
  rank,
  outputDecimals,
  isWinner,
  isFirst,
  assetSymbol,
  reduceMotion,
}: RaceMobileRowProps) {
  const isQuerying = row.status === 'querying';
  const isErrored = row.status === 'errored';
  const isSettled = row.status === 'settled';
  const outputToken = row.quote?.outputAmount ? formatTokenAmount(row.quote.outputAmount, outputDecimals) : '—';
  const subline = buildSubline(row);

  return (
    <motion.div
      layout={!reduceMotion}
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex items-center gap-3 border-b border-border-subtle px-4 py-3 last:border-b-0',
        isWinner && 'bg-accent-soft',
        isErrored && 'text-text-muted',
      )}
    >
      <span
        className={cn(
          'w-3 shrink-0 font-mono text-mark tabular-nums',
          isWinner ? 'font-medium text-accent' : 'text-text-secondary',
        )}
      >
        {rank ?? '—'}
      </span>
      <div className='flex min-w-0 flex-1 flex-col gap-1'>
        <ProviderChip provider={row.provider} />
        {subline ? <span className='pl-[30px] font-mono text-[10px] text-text-muted'>{subline}</span> : null}
      </div>
      <div className='flex shrink-0 flex-col items-end gap-1.5'>
        {isQuerying ? (
          <Skeleton wide reduceMotion={reduceMotion} />
        ) : isSettled ? (
          <span className='flex items-baseline gap-1 font-mono tabular-nums'>
            <span className='text-mark font-medium text-text-primary'>{outputToken}</span>
            <span className='text-caption text-text-muted'>{assetSymbol}</span>
          </span>
        ) : (
          <span className='font-mono text-label text-text-muted'>—</span>
        )}
        <RaceStatusPill
          status={row.status}
          isWinner={isWinner}
          isFirst={isFirst}
          errorMessage={row.errorMessage}
          reduceMotion={reduceMotion}
        />
      </div>
    </motion.div>
  );
}

// "412ms · 3s" from latency and eta. Only shown for a settled row that carries a
// quote; querying / errored rows lean on the skeleton or status pill instead.
function buildSubline(row: RaceRow): string | null {
  if (row.status !== 'settled' || !row.quote) return null;
  const latency = row.quote.latencyMs !== undefined ? formatLatency(row.quote.latencyMs) : null;
  const eta = row.quote.eta !== undefined ? formatEta(Math.round(row.quote.eta)) : null;
  return [latency, eta].filter(Boolean).join(' · ') || null;
}
