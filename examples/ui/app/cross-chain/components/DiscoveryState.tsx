'use client';

import { SpinnerIcon, WarningIcon } from './icons';

interface DiscoveryLoadingProps {
  message?: string;
}

/**
 * Loading state while discovering assets
 */
export function DiscoveryLoading({ message = 'Discovering available assets...' }: DiscoveryLoadingProps) {
  return (
    <div className='relative backdrop-blur-xl bg-surface/80 rounded-3xl border border-border/50 p-6 shadow-2xl'>
      <div className='absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent rounded-3xl pointer-events-none' />
      <div className='relative flex flex-col items-center justify-center gap-4 py-12'>
        <SpinnerIcon className='w-8 h-8 text-accent' />
        <p className='text-text-secondary'>{message}</p>
      </div>
    </div>
  );
}

interface DiscoveryErrorProps {
  error: Error;
  onRetry?: () => void;
}

/**
 * Error state when discovery fails
 */
export function DiscoveryError({ error, onRetry }: DiscoveryErrorProps) {
  return (
    <div className='rounded-3xl border border-error/30 bg-error/5 p-6'>
      <div className='flex flex-col items-center justify-center gap-4 py-8'>
        <div className='w-12 h-12 rounded-full bg-error flex items-center justify-center text-white'>
          <WarningIcon className='w-6 h-6' />
        </div>
        <div className='text-center'>
          <p className='text-error font-medium mb-1'>Failed to discover assets</p>
          <p className='text-text-tertiary text-sm max-w-xs'>
            {error.message || 'Unable to fetch supported tokens from the protocol.'}
          </p>
          {onRetry ? (
            <button
              onClick={onRetry}
              className='mt-3 px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors cursor-pointer'
            >
              Try Again
            </button>
          ) : (
            <p className='text-text-tertiary text-xs mt-2'>Please refresh the page to try again.</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface DiscoveryEmptyProps {
  message?: string;
  description?: string;
}

/**
 * Warning state when discovery succeeds but no chains are available
 */
export function DiscoveryEmpty({
  message = 'No supported chains',
  description = "The protocol doesn't support any of the configured chains.",
}: DiscoveryEmptyProps) {
  return (
    <div className='rounded-3xl border border-warning/30 bg-warning/5 p-6'>
      <div className='flex flex-col items-center justify-center gap-4 py-8'>
        <div className='w-12 h-12 rounded-full bg-warning flex items-center justify-center text-white'>
          <WarningIcon className='w-6 h-6' />
        </div>
        <div className='text-center'>
          <p className='text-warning font-medium mb-1'>{message}</p>
          <p className='text-text-tertiary text-sm max-w-xs'>{description}</p>
        </div>
      </div>
    </div>
  );
}
