import { cn } from '~/lib/cn';

interface SkeletonProps {
  wide?: boolean;
  reduceMotion?: boolean;
  className?: string;
}

export function Skeleton({ wide = false, reduceMotion = false, className }: SkeletonProps) {
  return (
    <span
      className={cn('block h-4 bg-border-subtle', !reduceMotion && 'animate-pulse', wide ? 'w-28' : 'w-14', className)}
    />
  );
}
