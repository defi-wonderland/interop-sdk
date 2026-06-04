'use client';

import { HeadToHead } from './HeadToHead';
import { useHeadToHeadMetrics } from './useHeadToHeadMetrics';
import type { ProviderMetrics } from '~/lib/types/historyMetrics';
import { cn } from '~/lib/cn';

interface HeadToHeadClientProps {
  initialMetrics: ProviderMetrics[];
}

export function HeadToHeadClient({ initialMetrics }: HeadToHeadClientProps) {
  const { metrics, isLoading, error } = useHeadToHeadMetrics(initialMetrics);

  return (
    <div>
      <div className={cn('transition-opacity', isLoading ? 'opacity-50' : 'opacity-100')} aria-busy={isLoading}>
        <HeadToHead metrics={metrics} />
      </div>
      {error ? (
        <div className='mt-2 border border-border bg-surface-elevated px-3 py-2 font-mono text-caption text-text-muted'>
          failed to load — {error}
        </div>
      ) : null}
    </div>
  );
}
