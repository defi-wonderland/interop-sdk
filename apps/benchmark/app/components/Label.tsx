import type { ComponentProps } from 'react';
import { cn } from '~/lib/cn';

export function Label({ children, className, ...rest }: ComponentProps<'span'>) {
  return (
    <span className={cn('cursor-default select-none', className)} {...rest}>
      {children}
    </span>
  );
}
