'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '../Icon';
import { Pill } from '../Pill';
import { Skeleton } from '../Skeleton';
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
  isFirst: boolean;
  maxLatencyMs: number;
  assetSymbol: AssetSymbol;
  reduceMotion: boolean;
}

export function RaceTableRow({
  row,
  rank,
  outputDecimals,
  isWinner,
  isFirst,
  maxLatencyMs,
  assetSymbol,
  reduceMotion,
}: RaceTableRowProps) {
  const isQuerying = row.status === 'querying';
  const isErrored = row.status === 'errored';
  const isSettled = row.status === 'settled';
  const outputUsd = parseOptionalNumber(row.quote?.outputAmountUsd);
  const outputToken = row.quote?.outputAmount ? formatTokenAmount(row.quote.outputAmount, outputDecimals) : '—';
  const mobileSubtitle = buildMobileSubtitle(row);

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
        'h-20 border-b border-border-subtle align-middle transition-colors last:border-b-0 md:h-[72px]',
        isWinner && 'bg-accent-soft',
        isErrored && 'text-text-muted',
      )}
    >
      <td className='w-10 px-3 py-3 md:w-12 md:px-4 md:py-4'>
        <div className='flex items-center gap-2 font-mono text-label'>
          {isWinner ? (
            <span className={cn('inline-block size-1.5 rounded-full', row.provider.colorClass)} aria-hidden='true' />
          ) : null}
          <span className={cn('tabular-nums', isWinner ? 'text-accent' : 'text-text-secondary')}>{rank ?? '—'}</span>
        </div>
      </td>
      <td className='px-3 py-3 md:px-4 md:py-4'>
        <div className='flex items-center gap-2.5 md:gap-3'>
          <Icon src={row.provider.iconUrl} alt='' size='md' />
          <div className='flex flex-col gap-0.5'>
            <span className='font-sans text-mark font-medium tracking-[-0.0125em] text-text-primary md:text-base'>
              {row.provider.displayName}
            </span>
            {mobileSubtitle ? (
              <span className='font-mono text-caption text-text-muted md:hidden'>{mobileSubtitle}</span>
            ) : null}
          </div>
        </div>
      </td>
      <td className='hidden px-4 py-4 md:table-cell'>
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
      <td className='px-3 py-3 md:px-4 md:py-4'>
        {isQuerying ? (
          <div className='flex justify-end'>
            <Skeleton wide reduceMotion={reduceMotion} />
          </div>
        ) : isSettled ? (
          <div className='flex flex-col items-end gap-1'>
            <div className='flex items-baseline gap-1.5'>
              <span className='font-mono text-mark font-medium text-text-primary tabular-nums'>{outputToken}</span>
              <span className='font-mono text-caption text-text-muted'>{assetSymbol}</span>
            </div>
            {outputUsd > 0 ? (
              <span className='font-mono text-caption text-text-muted tabular-nums'>
                <AnimatedUsd
                  value={outputUsd}
                  fallback={formatUsd(row.quote?.outputAmountUsd)}
                  reduceMotion={reduceMotion}
                />
              </span>
            ) : null}
            <div className='md:hidden'>
              <StatusPill
                status={row.status}
                isWinner={isWinner}
                isFirst={isFirst}
                errorMessage={row.errorMessage}
                reduceMotion={reduceMotion}
              />
            </div>
          </div>
        ) : (
          <div className='flex flex-col items-end gap-1'>
            <span className='font-mono text-label text-text-muted'>—</span>
            <div className='md:hidden'>
              <StatusPill
                status={row.status}
                isWinner={isWinner}
                isFirst={isFirst}
                errorMessage={row.errorMessage}
                reduceMotion={reduceMotion}
              />
            </div>
          </div>
        )}
      </td>
      <td className='hidden px-4 py-4 text-right md:table-cell'>
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
      <td className='hidden px-4 py-4 md:table-cell'>
        <StatusPill
          status={row.status}
          isWinner={isWinner}
          isFirst={isFirst}
          errorMessage={row.errorMessage}
          reduceMotion={reduceMotion}
        />
      </td>
    </motion.tr>
  );
}

function buildMobileSubtitle(row: RaceRow): string | null {
  if (row.status !== 'settled' || !row.quote) return null;
  const latency = row.quote.latencyMs !== undefined ? formatLatency(row.quote.latencyMs) : null;
  const eta = row.quote.eta !== undefined ? formatEta(Math.round(row.quote.eta)) : null;
  return [latency, eta].filter(Boolean).join(' · ') || null;
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
  const widthPercent = Math.max(4, Math.min(100, (latencyMs / Math.max(maxLatencyMs, 1)) * 100));
  return (
    <div className='h-[3px] w-40 max-w-full bg-border-subtle' aria-hidden='true'>
      <div className={cn('h-full', colorClass)} style={{ width: `${widthPercent}%` }} />
    </div>
  );
}

interface StatusPillProps {
  status: RowStatus;
  isWinner: boolean;
  isFirst: boolean;
  errorMessage?: string;
  reduceMotion: boolean;
}

function StatusPill({ status, isWinner, isFirst, errorMessage, reduceMotion }: StatusPillProps) {
  let pills: React.ReactNode = null;

  if (status === 'errored') {
    pills = (
      <Pill tone='error' title={errorMessage}>
        no route
      </Pill>
    );
  } else if (status === 'querying') {
    pills = (
      <Pill tone='muted' className={reduceMotion ? undefined : 'animate-pulse'}>
        querying
      </Pill>
    );
  } else if (status === 'settled' && (isWinner || isFirst)) {
    pills = (
      <>
        {isWinner ? (
          <Pill tone='accent' icon='★'>
            winner
          </Pill>
        ) : null}
        {isFirst ? <Pill tone='outline'>first</Pill> : null}
      </>
    );
  }

  if (!pills) return null;
  return <div className='flex flex-wrap items-center justify-end gap-1.5'>{pills}</div>;
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
