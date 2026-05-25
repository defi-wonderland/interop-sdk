/* eslint-disable @next/next/no-img-element */
import { cn } from '~/lib/cn';

interface IconProps {
  src: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<IconProps['size']>, string> = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
};

export function Icon({ src, alt, size = 'md', className }: IconProps) {
  return <img src={src} alt={alt} className={cn(SIZE_CLASS[size], 'rounded-full object-contain', className)} />;
}
