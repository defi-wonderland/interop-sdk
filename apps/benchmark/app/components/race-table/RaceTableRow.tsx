'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '../Icon';
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
  maxLatencyMs: number;
  assetSymbol: AssetSymbol;
  reduceMotion: boolean;
}

export function RaceTableRow({
  row,
  rank,
  outputDecimals,
  isWinner,
  isFastest,
  maxLatencyMs,
  assetSymbol,
  reduceMotion,
}: RaceTableRowProps) {
  const isQuerying = row.status === 'querying';
  const isErrored = row.status === 'errored';
  const isSettled = row.status === 'settled';
  const outputUsd = parseOptionalNumber(row.quote?.outputAmountUsd);
  const outputToken = row.quote?.outputAmount ? formatTokenAmount(row.quote.outputAmount, outputDecimals) : '—';

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
                  boxShadow: ['0 0 0 rgba(26,58,92,0)', '0 0 28px rgba(26,58,92,0.16)', '0 0 0 rgba(26,58,92,0)'],
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
      <td className='w-12 px-4 py-4'>
        <div className='flex items-center gap-2 font-mono text-label'>
          <span className={cn('inline-block size-1.5 rounded-full', row.provider.colorClass)} aria-hidden='true' />
          <span className='tabular-nums'>{rank ?? '—'}</span>
        </div>
      </td>
      <td className='px-4 py-4'>
        <div className='flex items-center gap-3'>
          <Icon src={row.provider.iconUrl} alt='' size='lg' />
          <span className='font-sans text-lg font-medium tracking-tight text-text-primary'>
            {row.provider.displayName}
          </span>
        </div>
      </td>
      <td className='px-4 py-4'>
        {isQuerying ? (
          <Skeleton reduceMotion={reduceMotion} />
        ) : isSettled && row.quote?.latencyMs !== undefined ? (
          <div className='flex flex-col gap-1.5'>
            <span className='font-mono text-mark text-text-primary tabular-nums'>
              <AnimatedLatency value={row.quote.latencyMs} reduceMotion={reduceMotion} />
            </span>
            <LatencyBar
              latencyMs={row.quote.latencyMs}
              maxLatencyMs={maxLatencyMs}
              colorClass={row.provider.colorClass}
            />
          </div>
        ) : (
          <span className='font-mono text-label text-text-muted'>—</span>
        )}
      </td>
      <td className='px-4 py-4'>
        {isQuerying ? (
          <Skeleton wide reduceMotion={reduceMotion} />
        ) : isSettled ? (
          <div className='flex items-baseline justify-end gap-1.5'>
            <span className='font-mono text-mark font-medium text-text-primary tabular-nums'>{outputToken}</span>
            <span className='font-mono text-caption text-text-muted'>{assetSymbol}</span>
          </div>
        ) : (
          <div className='text-right font-mono text-label text-text-muted'>—</div>
        )}
        {isSettled ? (
          <div className='text-right font-mono text-caption text-text-muted tabular-nums'>
            <AnimatedUsd
              value={outputUsd}
              fallback={formatUsd(row.quote?.outputAmountUsd)}
              reduceMotion={reduceMotion}
            />
          </div>
        ) : null}
      </td>
      <td className='px-4 py-4 text-right'>
        {isQuerying ? (
          <Skeleton reduceMotion={reduceMotion} />
        ) : isSettled ? (
          <span className='font-mono text-label text-text-secondary tabular-nums'>
            <AnimatedEta value={row.quote?.eta} reduceMotion={reduceMotion} />
          </span>
        ) : (
          <span className='font-mono text-label text-text-muted'>—</span>
        )}
      </td>
      <td className='px-4 py-4'>
        <div className='flex justify-end'>
          <StatusPill
            status={row.status}
            isWinner={isWinner}
            isFastest={isFastest}
            errorMessage={row.errorMessage}
            reduceMotion={reduceMotion}
          />
        </div>
      </td>
    </motion.tr>
  );
}

function LatencyBar({
  latencyMs,
  maxLatencyMs,
  colorClass,
}: {
  latencyMs: number;
  maxLatencyMs: number;
  colorClass: string;
}) {
  const widthPercent = Math.max(8, Math.min(100, (latencyMs / Math.max(maxLatencyMs, 1)) * 100));
  return (
    <div className='h-[3px] w-40 max-w-full bg-border-subtle' aria-hidden='true'>
      <div className={cn('h-full', colorClass)} style={{ width: `${widthPercent}%` }} />
    </div>
  );
}

interface StatusPillProps {
  status: RowStatus;
  isWinner: boolean;
  isFastest: boolean;
  errorMessage?: string;
  reduceMotion: boolean;
}

function StatusPill({ status, isWinner, isFastest, errorMessage, reduceMotion }: StatusPillProps) {
  if (status === 'errored') {
    return (
      <Pill tone='error' title={errorMessage}>
        no route
      </Pill>
    );
  }
  if (status === 'querying') {
    return (
      <Pill tone='muted' className={reduceMotion ? undefined : 'animate-pulse'}>
        querying
      </Pill>
    );
  }
  if (status === 'settled' && isWinner) {
    return (
      <Pill tone='accent' icon='★'>
        winner
      </Pill>
    );
  }
  if (status === 'settled' && isFastest) {
    return <Pill tone='outline'>fastest</Pill>;
  }
  return null;
}

interface PillProps {
  tone: 'accent' | 'outline' | 'muted' | 'error';
  title?: string;
  className?: string;
  icon?: string;
  children: React.ReactNode;
}

const PILL_BASE =
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-caption uppercase tracking-widest';

const PILL_TONE: Record<PillProps['tone'], string> = {
  accent: 'bg-accent text-on-accent',
  outline: 'border border-accent/40 text-accent',
  muted: 'border border-border-subtle text-text-muted',
  error: 'border border-error/40 text-error',
};

function Pill({ tone, title, className, icon, children }: PillProps) {
  return (
    <span title={title} className={cn(PILL_BASE, PILL_TONE[tone], className)}>
      {icon ? <span aria-hidden='true'>{icon}</span> : null}
      {children}
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
