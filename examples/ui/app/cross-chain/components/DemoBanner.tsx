import { WarningIcon } from './icons';

export function DemoBanner() {
  return (
    <div className='relative overflow-hidden rounded-xl border border-warning/30 backdrop-blur-sm'>
      <div className='absolute inset-y-0 left-0 w-1 bg-warning' />
      <div className='flex items-center gap-3 bg-warning-light/60 px-4 py-3'>
        <WarningIcon className='w-4 h-4 shrink-0 text-warning' />
        <p className='text-sm text-text-secondary'>
          This is a demo app for testing and experimentation. Do not use large amounts.
        </p>
      </div>
    </div>
  );
}
