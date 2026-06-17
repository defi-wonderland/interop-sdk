import type { BestAtBadge } from '~/lib/headToHeadBadges';

// Accent chip naming a category a provider leads (FASTEST / CHEAPEST / MOST
// ACTIVE). Shared by the desktop head-to-head cell and the mobile card so both
// render the badge identically.
export function BestAtBadgeChip({ label }: { label: BestAtBadge }) {
  return (
    <span className='inline-flex items-center whitespace-nowrap bg-accent px-2 py-[3px] font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-on-accent'>
      {label}
    </span>
  );
}
