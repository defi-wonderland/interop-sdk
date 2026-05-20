'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { parseUnits } from 'viem';
import { Icon } from './Icon';
import { Label } from './Label';
import type { NetworkAssets, QuoteRequest } from '@wonderland/interop-cross-chain';
import type { ProviderQuoteResult } from '~/lib/types';
import { ASSETS, AssetSymbol } from '~/lib/assets';
import { CHAINS, ChainId } from '~/lib/chains';
import { cn } from '~/lib/cn';
import { formatEta, formatLatency, formatTokenAmount, formatUsd } from '~/lib/formatters';
import { PROVIDERS, ProviderId, type ProviderMeta } from '~/lib/providers';
import { useRequestBarStore } from '~/lib/requestBarStore';
import { chainService, quotesService } from '~/lib/services';

const USER_PLACEHOLDER = '0x000000000000000000000000000000000000dEaD';
const EXPECTED_PROVIDER_IDS = [ProviderId.Across, ProviderId.Relay, ProviderId.Lifi, ProviderId.Bungee] as const;
const PROVIDER_NAME: Record<ProviderId, string> = {
  [ProviderId.Across]: 'Across',
  [ProviderId.Relay]: 'Relay',
  [ProviderId.Lifi]: 'LI.FI',
  [ProviderId.Bungee]: 'Bungee',
};

type RowStatus = 'idle' | 'querying' | 'settled' | 'errored';
type SortKey = 'latency' | 'output' | 'eta';
type SortDirection = 'asc' | 'desc';

interface RaceRow {
  provider: ProviderMeta;
  status: RowStatus;
  quote?: ProviderQuoteResult;
  errorMessage?: string;
}

interface AssetLookup {
  address: string;
  decimals: number;
}

export function RaceTable() {
  const fromChainId = useRequestBarStore((state) => state.fromChainId);
  const toChainId = useRequestBarStore((state) => state.toChainId);
  const assetSymbol = useRequestBarStore((state) => state.assetSymbol);
  const runId = useRequestBarStore((state) => state.runId);
  const reduceMotion = useReducedMotion();
  const [chains, setChains] = useState<NetworkAssets[]>([]);
  const [chainStatus, setChainStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [rows, setRows] = useState<RaceRow[]>(() => createRows('idle'));
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'output', direction: 'desc' });

  useEffect(() => {
    let cancelled = false;

    chainService
      .getChains()
      .then((networks) => {
        if (cancelled) return;
        setChains(networks);
        setChainStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setChainStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (chainStatus === 'loading') return;

    let cancelled = false;
    const requestRun = async () => {
      setRows(createRows('querying'));

      try {
        const requestState = useRequestBarStore.getState();
        const request = buildQuoteRequest({
          chains,
          fromChainId: requestState.fromChainId,
          toChainId: requestState.toChainId,
          assetSymbol: requestState.assetSymbol,
          amount: requestState.amount,
        });
        const response = await quotesService.getQuotes(request);
        if (cancelled) return;

        const quoteByProvider = new Map(response.quotes.map((quote) => [normalizeProviderId(quote.providerId), quote]));
        const rowsByProvider = EXPECTED_PROVIDER_IDS.map<RaceRow>((providerId) => {
          const quote = quoteByProvider.get(providerId);
          if (quote) {
            return { provider: PROVIDERS[providerId], status: 'settled', quote };
          }

          return { provider: PROVIDERS[providerId], status: 'errored', errorMessage: 'NO ROUTE' };
        });

        setRows(rowsByProvider);
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
  }, [chainStatus, chains, runId]);

  const winnerProviderId = useMemo(() => findBestProvider(rows, 'output'), [rows]);
  const fastestProviderId = useMemo(() => findBestProvider(rows, 'latency'), [rows]);
  const sortedRows = useMemo(() => sortRows(rows, sort), [rows, sort]);
  const outputDecimals = findAsset(chains, toChainId, assetSymbol)?.decimals ?? 6;

  const toggleSort = (key: SortKey) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  return (
    <section aria-label='live quote race results' className='overflow-hidden border border-border bg-surface'>
      <div className='flex flex-col gap-2 border-b border-border-subtle px-4 py-3 md:flex-row md:items-center md:justify-between'>
        <div>
          <Label className='font-mono text-caption uppercase tracking-widest text-text-muted'>current route</Label>
          <p className='mt-1 font-sans text-xl font-medium tracking-tight text-text-primary'>
            {CHAINS[fromChainId].displayName} → {CHAINS[toChainId].displayName} · {ASSETS[assetSymbol].displayName}
          </p>
        </div>
        <Label className='font-mono text-label text-text-muted'>run #{runId + 1}</Label>
      </div>

      <div className='overflow-x-auto'>
        <table className='w-full min-w-[48rem] border-collapse text-left'>
          <thead>
            <tr className='border-b border-border-subtle font-mono text-caption uppercase tracking-widest text-text-muted'>
              <th className='px-4 py-3 font-medium'>rank</th>
              <th className='px-4 py-3 font-medium'>provider</th>
              <SortableHeader
                label='latency'
                active={sort.key === 'latency'}
                direction={sort.direction}
                onClick={() => toggleSort('latency')}
              />
              <SortableHeader
                label='output'
                active={sort.key === 'output'}
                direction={sort.direction}
                onClick={() => toggleSort('output')}
              />
              <SortableHeader
                label='eta'
                active={sort.key === 'eta'}
                direction={sort.direction}
                onClick={() => toggleSort('eta')}
              />
              <th className='px-4 py-3 font-medium'>status</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, index) => (
              <RaceTableRow
                key={row.provider.id}
                row={row}
                rank={row.status === 'settled' ? index + 1 : null}
                outputDecimals={outputDecimals}
                isWinner={row.provider.id === winnerProviderId}
                isFastest={row.provider.id === fastestProviderId}
                assetSymbol={assetSymbol}
                reduceMotion={Boolean(reduceMotion)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SortableHeader({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
}) {
  return (
    <th className='px-4 py-3 font-medium'>
      <button
        type='button'
        onClick={onClick}
        className={cn(
          'inline-flex cursor-pointer items-center gap-1 transition hover:text-text-primary',
          active && 'text-text-primary',
        )}
      >
        {label}
        <span aria-hidden='true'>{active ? (direction === 'asc' ? '↑' : '↓') : '↕'}</span>
      </button>
    </th>
  );
}

function RaceTableRow({
  row,
  rank,
  outputDecimals,
  isWinner,
  isFastest,
  assetSymbol,
  reduceMotion,
}: {
  row: RaceRow;
  rank: number | null;
  outputDecimals: number;
  isWinner: boolean;
  isFastest: boolean;
  assetSymbol: AssetSymbol;
  reduceMotion: boolean;
}) {
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
              <span className='font-sans text-lg font-medium text-text-primary'>{PROVIDER_NAME[row.provider.id]}</span>
              {isWinner ? <Badge reduceMotion={reduceMotion}>winner</Badge> : null}
              {isFastest && !isWinner ? <Badge reduceMotion={reduceMotion}>fastest</Badge> : null}
              {isFastest && isWinner ? <Badge reduceMotion={reduceMotion}>fastest</Badge> : null}
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

function createRows(status: RowStatus, errorMessage?: string): RaceRow[] {
  return EXPECTED_PROVIDER_IDS.map((providerId) => ({ provider: PROVIDERS[providerId], status, errorMessage }));
}

function buildQuoteRequest({
  chains,
  fromChainId,
  toChainId,
  assetSymbol,
  amount,
}: {
  chains: NetworkAssets[];
  fromChainId: ChainId;
  toChainId: ChainId;
  assetSymbol: AssetSymbol;
  amount: string;
}): QuoteRequest {
  const inputAsset = findAsset(chains, fromChainId, assetSymbol);
  const outputAsset = findAsset(chains, toChainId, assetSymbol);

  if (!inputAsset || !outputAsset) {
    throw new Error('NO ROUTE');
  }

  return {
    user: USER_PLACEHOLDER,
    input: {
      chainId: fromChainId,
      assetAddress: inputAsset.address,
      amount: parseAmount(amount, inputAsset.decimals),
    },
    output: {
      chainId: toChainId,
      assetAddress: outputAsset.address,
      recipient: USER_PLACEHOLDER,
    },
    swapType: 'exact-input',
  };
}

function findAsset(chains: NetworkAssets[], chainId: ChainId, symbol: AssetSymbol): AssetLookup | undefined {
  const network = chains.find((entry) => entry.chainId === chainId);
  const asset = network?.assets.find((entry) => entry.symbol.toUpperCase() === symbol);
  return asset ? { address: asset.address, decimals: asset.decimals } : undefined;
}

function parseAmount(value: string, decimals: number): string {
  const normalized = value.replace(/,/g, '').trim();
  if (!normalized || Number.isNaN(Number(normalized))) {
    throw new Error('Enter a valid amount');
  }

  return parseUnits(normalized, decimals).toString();
}

function normalizeProviderId(providerId: string): ProviderId | undefined {
  const normalized = providerId.toLowerCase();
  return EXPECTED_PROVIDER_IDS.find((id) => id === normalized);
}

function findBestProvider(rows: RaceRow[], metric: 'output' | 'latency'): ProviderId | undefined {
  const settled = rows.filter((row) => row.status === 'settled' && row.quote);
  const sorted = [...settled].sort((left, right) => {
    if (metric === 'output') {
      return parseOptionalNumber(right.quote?.outputAmountUsd) - parseOptionalNumber(left.quote?.outputAmountUsd);
    }

    return valueOrInfinity(left.quote?.latencyMs) - valueOrInfinity(right.quote?.latencyMs);
  });

  return sorted[0]?.provider.id;
}

function sortRows(rows: RaceRow[], sort: { key: SortKey; direction: SortDirection }): RaceRow[] {
  return [...rows].sort((left, right) => {
    if (left.status === 'errored' && right.status !== 'errored') return 1;
    if (right.status === 'errored' && left.status !== 'errored') return -1;

    const leftValue = getSortValue(left, sort.key);
    const rightValue = getSortValue(right, sort.key);
    const modifier = sort.direction === 'asc' ? 1 : -1;
    return (leftValue - rightValue) * modifier;
  });
}

function getSortValue(row: RaceRow, key: SortKey): number {
  if (key === 'output') return parseOptionalNumber(row.quote?.outputAmountUsd);
  if (key === 'latency') return valueOrInfinity(row.quote?.latencyMs);
  return valueOrInfinity(row.quote?.eta);
}

function parseOptionalNumber(value: string | number | undefined): number {
  if (value === undefined) return 0;
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function valueOrInfinity(value: number | undefined): number {
  return value === undefined ? Number.POSITIVE_INFINITY : value;
}
