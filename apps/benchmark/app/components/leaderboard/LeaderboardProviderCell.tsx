import { Icon } from '../Icon';
import { formatFillCount, formatSampleWindow } from './formatters';
import type { ProviderMeta } from '~/lib/providers';

interface LeaderboardProviderCellProps {
  provider: ProviderMeta;
  fillCount: number | null;
  windowSeconds: number | null;
}

// Leaderboard variant of the provider cell: under the name it carries the
// sample's size and span together as secondary context (e.g. `1,200 fills · 2.7d`),
// or the no-feed reason for a placeholder provider. Head-to-head keeps the plain
// ProviderCell, so this lives on its own instead of branching one component.
export function LeaderboardProviderCell({ provider, fillCount, windowSeconds }: LeaderboardProviderCellProps) {
  const sublabel = buildSublabel(provider, fillCount, windowSeconds);

  return (
    <div className='flex items-center gap-2.5 md:gap-3'>
      <Icon src={provider.iconUrl} alt='' size='md' />
      <div className='flex min-w-0 flex-col gap-0.5'>
        <span className='truncate font-sans text-mark font-medium tracking-[-0.0125em] text-text-primary md:text-base'>
          {provider.displayName}
        </span>
        {sublabel ? (
          <span className='truncate font-mono text-caption tracking-[0.02em] text-text-muted'>{sublabel}</span>
        ) : null}
      </div>
    </div>
  );
}

function buildSublabel(provider: ProviderMeta, fillCount: number | null, windowSeconds: number | null): string | null {
  // No public feed (e.g. the Bungee placeholder): say why, not a fill count.
  if (!provider.hasGlobalFeed) return provider.noFeedReason ?? null;
  // Has a feed but returned nothing usable (failed or empty window): no sublabel.
  if (fillCount === null) return null;
  const fills = `${formatFillCount(fillCount)} fills`;
  const window = formatSampleWindow(windowSeconds);
  return window === '—' ? fills : `${fills} · ${window}`;
}
