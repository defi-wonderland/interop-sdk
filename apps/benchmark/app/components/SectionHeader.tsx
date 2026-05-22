import type { ReactNode } from 'react';
import { cn } from '~/lib/cn';

interface SectionHeaderProps {
  index: string;
  label: string;
  title: string;
  rightSlot?: ReactNode;
}

export function SectionHeader({ index, label, title, rightSlot }: SectionHeaderProps) {
  return (
    <div className='flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-6'>
      <div className='flex flex-col gap-2'>
        <div className='flex items-center gap-2.5'>
          <span className='block h-px w-4 bg-accent' aria-hidden='true' />
          <span
            className={cn('cursor-default select-none font-mono text-label uppercase tracking-wider text-text-muted')}
          >
            {index} <span className='text-border'>·</span> {label}
          </span>
        </div>
        <h2 className='cursor-default select-none font-sans text-lg font-medium tracking-tight text-text-primary md:text-xl'>
          {title}
        </h2>
      </div>
      {rightSlot ? <div className='shrink-0'>{rightSlot}</div> : null}
    </div>
  );
}
