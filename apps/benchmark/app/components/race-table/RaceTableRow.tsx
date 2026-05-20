'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '../Icon';
import { Label } from '../Label';
import { parseOptionalNumber } from './raceRows';
import type { RaceRow, RowStatus } from './types';
import { AssetSymbol } from '~/lib/assets';
import { cn } from '~/lib/cn';
import { formatEta, formatLatency, formatTokenAmount, formatUsd } from '~/lib/formatters';

interface RaceTableRowProps {
  row: RaceRow;
  rank: number | null;
  outputDecimals: number;
  isWinner: boolean;
  isFastest: boolean;
  assetSymbol: AssetSymbol;
  reduceMotion: boolean;
}

export function RaceTableRow({
  row,
  rank,
  outputDecimals,
  isWinner,
  isFastest,
  assetSymbol,
  reduceMotion,
}: RaceTableRowProps) {
  const isQuerying = row.status === 'querying';
  const isErrored = row.status === 'errored';
  const outputUsd = parseOptionalNumber(row.quote?.outputAmountUsd);
  const outputToken = row.quote?.outputAmount
    ? formatTokenAmount(row.quote.outputAmount, outputDecimals)
    : isQuerying
      ? ''
      : '—';

  return (
    <motion.tr
      layout={!reduceMotion}
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={
        reduceMotion
          ? { opacity: 1 }
          : isErrored
            ? { opacity: 1, x: [0, -3, 3, -2, 0], y: 0 }
            : isWinner
              ? {
                  opacity: 1,
                  y: 0,
                  boxShadow: ['0 0 0 rgba(184,72,38,0)', '0 0 28px rgba(184,72,38,0.16)', '0 0 0 rgba(184,72,38,0)'],
                }
              : { opacity: 1, y: 0 }
      }
      transition={{ duration: 0.2 }}
      className={cn(
        'border-b border-border-subtle transition-colors last:border-b-0',
        isWinner && 'bg-accent-soft',
        isErrored && 'text-text-muted',
      )}
    >
      <td className='px-4 py-4 font-mono text-label text-text-muted'>{rank ? `#${rank}` : '—'}</td>
      <td className='px-4 py-4'>
        <div className='flex items-center gap-3'>
          <Icon src={row.provider.iconUrl} alt='' size='lg' />
          <div>
            <div className='flex items-center gap-2'>
              <span className='font-sans text-lg font-medium text-text-primary'>{row.provider.displayName}</span>
              {isWinner ? <Badge reduceMotion={reduceMotion}>winner</Badge> : null}
              {isFastest ? <Badge reduceMotion={reduceMotion}>fastest</Badge> : null}
            </div>
            <Label className='font-mono text-caption uppercase tracking-widest text-text-muted'>
              {row.provider.monogram}
            </Label>
          </div>
        </div>
      </td>
      <td className='px-4 py-4 font-mono text-label text-text-secondary'>
        {isQuerying ? (
          <Skeleton reduceMotion={reduceMotion} />
        ) : (
          <AnimatedLatency value={row.quote?.latencyMs} reduceMotion={reduceMotion} />
        )}
      </td>
      <td className='px-4 py-4'>
        {isQuerying ? (
          <Skeleton wide reduceMotion={reduceMotion} />
        ) : (
          <div className='flex flex-col gap-1'>
            <span className='font-mono text-label text-text-primary'>
              {outputToken} {assetSymbol}
            </span>
            <span className='font-mono text-caption text-text-muted'>
              <AnimatedUsd
                value={outputUsd}
                fallback={formatUsd(row.quote?.outputAmountUsd)}
                reduceMotion={reduceMotion}
              />
            </span>
          </div>
        )}
      </td>
      <td className='px-4 py-4 font-mono text-label text-text-secondary'>
        {isQuerying ? (
          <Skeleton reduceMotion={reduceMotion} />
        ) : (
          <AnimatedEta value={row.quote?.eta} reduceMotion={reduceMotion} />
        )}
      </td>
      <td className='px-4 py-4'>
        <StatusPill status={row.status} message={row.errorMessage} reduceMotion={reduceMotion} />
      </td>
    </motion.tr>
  );
}

function Badge({ children, reduceMotion }: { children: string; reduceMotion: boolean }) {
  return (
    <motion.span
      initial={reduceMotion ? false : { scale: 0.9 }}
      animate={reduceMotion ? { opacity: 1 } : { scale: [1, 1.08, 1] }}
      transition={{ duration: 0.2 }}
      className='rounded-full border border-accent/40 bg-accent-soft px-2 py-0.5 font-mono text-caption uppercase tracking-widest text-accent'
    >
      {children}
    </motion.span>
  );
}

function StatusPill({ status, message, reduceMotion }: { status: RowStatus; message?: string; reduceMotion: boolean }) {
  const label = status === 'errored' ? 'NO ROUTE' : status;
  return (
    <span
      title={message}
      className={cn(
        'inline-flex rounded-full border px-2 py-1 font-mono text-caption uppercase tracking-widest',
        status === 'settled' && 'border-success/40 bg-success/10 text-success',
        status === 'querying' && 'border-accent/40 bg-accent-soft text-accent',
        status === 'querying' && !reduceMotion && 'animate-pulse',
        status === 'idle' && 'border-border-subtle text-text-muted',
        status === 'errored' && 'border-error/40 bg-error/10 text-error',
      )}
    >
      {label}
    </span>
  );
}

function Skeleton({ wide = false, reduceMotion }: { wide?: boolean; reduceMotion: boolean }) {
  return (
    <span className={cn('block h-4 bg-border-subtle', !reduceMotion && 'animate-pulse', wide ? 'w-28' : 'w-14')} />
  );
}

function AnimatedLatency({ value, reduceMotion }: { value?: number; reduceMotion: boolean }) {
  const animated = useCountUp(value, reduceMotion);
  return <>{formatLatency(animated)}</>;
}

function AnimatedEta({ value, reduceMotion }: { value?: number; reduceMotion: boolean }) {
  const animated = useCountUp(value, reduceMotion);
  return <>{formatEta(animated === undefined ? undefined : Math.round(animated))}</>;
}

function AnimatedUsd({ value, fallback, reduceMotion }: { value?: number; fallback: string; reduceMotion: boolean }) {
  const animated = useCountUp(value, reduceMotion);
  if (animated === undefined) return <>{fallback}</>;
  return <>{formatUsd(animated.toString())}</>;
}

function useCountUp(value: number | undefined, reduceMotion: boolean) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    if (value === undefined || reduceMotion) {
      setDisplay(value);
      previous.current = value;
      return;
    }

    const start = previous.current ?? 0;
    const end = value;
    const startedAt = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / 200, 1);
      setDisplay(start + (end - start) * progress);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        previous.current = end;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduceMotion, value]);

  return display;
}
