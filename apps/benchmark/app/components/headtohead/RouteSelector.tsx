import { CHAINS, type ChainId } from '~/lib/chains';
import { cn } from '~/lib/cn';

interface RouteSelectorProps {
  fromChainId: ChainId;
  toChainId: ChainId;
  assetSymbol: string;
  assetColorClass: string;
}

/**
 * Static route summary pill rendered next to the section header. Matches the
 * shape of the Pencil design's `routeSel`; the caret is decorative — the
 * actual route still lives in the global request bar at the top of the page.
 */
export function RouteSelector({ fromChainId, toChainId, assetSymbol, assetColorClass }: RouteSelectorProps) {
  const from = CHAINS[fromChainId];
  const to = CHAINS[toChainId];

  return (
    <div className='flex items-center gap-3.5 border border-border bg-surface-elevated px-4 py-2.5'>
      <span className='font-mono text-label uppercase tracking-wider text-text-muted'>ROUTE</span>
      <div className='flex items-center gap-2 font-mono text-mark text-text-primary'>
        <Dot className={assetColorClass} />
        <span>{assetSymbol}</span>
        <span className='text-text-muted'>·</span>
        <Dot className={from.colorClass} />
        <span>{from.displayName}</span>
        <span className='text-text-muted'>→</span>
        <Dot className={to.colorClass} />
        <span>{to.displayName}</span>
      </div>
    </div>
  );
}

function Dot({ className }: { className: string }) {
  return <span className={cn('inline-block size-1.5 rounded-full', className)} aria-hidden='true' />;
}
