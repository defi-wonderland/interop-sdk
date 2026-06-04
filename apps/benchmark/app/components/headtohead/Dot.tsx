import { cn } from '~/lib/cn';

export function Dot({ className }: { className: string }) {
  return <span className={cn('inline-block size-1.5 rounded-full', className)} aria-hidden='true' />;
}
