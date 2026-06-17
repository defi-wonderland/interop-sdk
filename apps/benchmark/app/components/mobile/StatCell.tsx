import { cn } from '~/lib/cn';

interface StatCellProps {
  label: string;
  value: string;
  // $/% values read better in mono; everything else uses the sans value font.
  // Defaults to mono since most stat values are numeric.
  mono?: boolean;
  // Right-aligns the pair, used for the trailing stat in a justify-between row.
  align?: 'start' | 'end';
  className?: string;
}

const VALUE_BASE = 'text-[13px] font-medium tracking-[-0.0125em] text-text-primary';

// Shared mobile stat: a mono uppercase micro-label stacked over its value.
// Dropped into a justify-between row to form the stat strip on the leaderboard
// and head-to-head cards.
export function StatCell({ label, value, mono = true, align = 'start', className }: StatCellProps) {
  return (
    <div className={cn('flex flex-col gap-[3px]', align === 'end' && 'items-end', className)}>
      <span className='font-mono text-[9px] uppercase leading-none tracking-[0.04em] text-text-muted'>{label}</span>
      <span className={cn(VALUE_BASE, mono ? 'font-mono tabular-nums' : 'font-sans')}>{value}</span>
    </div>
  );
}
