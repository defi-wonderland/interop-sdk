import { Icon } from '../Icon';
import type { ProviderMeta } from '~/lib/providers';

export function ProviderCell({ provider }: { provider: ProviderMeta }) {
  return (
    <div className='flex items-center gap-2.5 md:gap-3'>
      <Icon src={provider.iconUrl} alt='' size='md' />
      <span className='font-sans text-mark font-medium tracking-[-0.0125em] text-text-primary md:text-base'>
        {provider.displayName}
      </span>
      {provider.noFeedReason ? (
        <span className='hidden whitespace-nowrap font-mono text-caption uppercase tracking-[0.06em] text-text-muted md:inline'>
          {provider.noFeedReason}
        </span>
      ) : null}
    </div>
  );
}
