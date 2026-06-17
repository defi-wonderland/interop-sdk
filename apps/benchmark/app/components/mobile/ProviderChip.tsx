import { cn } from '~/lib/cn';
import { ProviderId, type ProviderMeta } from '~/lib/providers';

// Two-letter initials shown inside the colored square. Derived from a small map
// keyed by provider id so LI.FI reads "LI" rather than the first two letters of
// its display name.
const PROVIDER_INITIALS: Record<ProviderId, string> = {
  [ProviderId.Across]: 'AX',
  [ProviderId.Relay]: 'RL',
  [ProviderId.Lifi]: 'LI',
  [ProviderId.Bungee]: 'BG',
};

interface ProviderChipProps {
  provider: ProviderMeta;
  className?: string;
}

// Shared mobile provider identity: a colored rounded square holding the
// provider's two-letter initials, followed by its display name. Used across all
// three mobile card sections so they read as one system. The colored square
// (not the icon) matches the desktop "Bench / Mobile" design source.
export function ProviderChip({ provider, className }: ProviderChipProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-[4px]',
          'font-mono text-[8px] font-semibold leading-none text-on-accent',
          provider.colorClass,
        )}
        aria-hidden='true'
      >
        {PROVIDER_INITIALS[provider.id]}
      </span>
      <span className='truncate font-sans text-sm font-medium tracking-[-0.0125em] text-text-primary'>
        {provider.displayName}
      </span>
    </div>
  );
}
