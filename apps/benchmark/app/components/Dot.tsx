import { cn } from '~/lib/cn';

interface DotProps {
  className: string;
  size?: 'xs' | 'sm' | 'md';
}

const SIZE_CLASS: Record<NonNullable<DotProps['size']>, string> = {
  xs: 'size-1.5',
  sm: 'size-2',
  md: 'size-2.5',
};

export function Dot({ className, size = 'sm' }: DotProps) {
  return <span className={cn('inline-block rounded-full', SIZE_CLASS[size], className)} aria-hidden='true' />;
}
