import type { ReactNode } from 'react';

interface SectionFrameProps {
  children: ReactNode;
  variant?: 'default' | 'tinted';
  divider?: boolean;
}

const VARIANT_BG: Record<NonNullable<SectionFrameProps['variant']>, string> = {
  default: 'bg-background',
  tinted: 'bg-surface',
};

export function SectionFrame({ children, variant = 'default', divider = true }: SectionFrameProps) {
  return (
    <section className={`${VARIANT_BG[variant]} ${divider ? 'border-b border-border-subtle' : ''}`}>
      <div className='mx-auto flex max-w-page flex-col gap-7 px-5 py-12 md:px-12 md:py-16 md:gap-9 lg:px-24 lg:py-20'>
        {children}
      </div>
    </section>
  );
}
