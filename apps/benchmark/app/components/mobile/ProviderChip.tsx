import { Icon } from '../Icon';
import type { ProviderMeta } from '~/lib/providers';
import { cn } from '~/lib/cn';

interface ProviderChipProps {
  provider: ProviderMeta;
  className?: string;
}

// Shared mobile provider identity: the provider's icon followed by its display
// name. Used across all three mobile card sections so they read as one system,
// and matches the icon the desktop tables use.
export function ProviderChip({ provider, className }: ProviderChipProps): React.ReactNode {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Icon src={provider.iconUrl} alt='' size='md' />
      <span className='truncate font-sans text-sm font-medium tracking-[-0.0125em] text-text-primary'>
        {provider.displayName}
      </span>
    </div>
  );
}
