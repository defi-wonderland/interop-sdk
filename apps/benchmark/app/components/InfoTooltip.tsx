'use client';

import { useId } from 'react';
import { cn } from '~/lib/cn';

interface InfoTooltipProps {
  /** Visible column label. */
  label: string;
  /** Plain-language explanation shown on hover or focus. */
  text: string;
  /** Extra classes for the trigger (e.g. to inherit a cell's label styling). */
  className?: string;
  /**
   * Which edge the popover anchors to. Headers use 'right' (the default) so it
   * stays inside the table's overflow box. Mobile stat cells pass 'left' for
   * left-aligned cells so the popover opens toward the card's free space.
   */
  side?: 'left' | 'right';
}

// Dropped below the trigger; anchored to one edge so it doesn't overflow its
// container (the table's overflow box on desktop, the card on mobile).
const TOOLTIP_CLASS =
  'pointer-events-none absolute top-full z-20 mt-2 w-max max-w-[15rem] whitespace-normal border ' +
  'border-border bg-surface-elevated px-2.5 py-1.5 text-left font-sans text-mark normal-case leading-snug ' +
  'tracking-normal text-text-secondary opacity-0 shadow-lg transition-opacity duration-150 ' +
  'group-hover:opacity-100 group-focus-within:opacity-100';

export function InfoTooltip({ label, text, className, side = 'right' }: InfoTooltipProps) {
  // useId keeps the trigger/tooltip association unique even when several tables
  // render the same column keys on one page.
  const id = useId();

  // The tooltip lives outside the button so the button's accessible name stays
  // the label alone. It's aria-hidden so screen readers skip it while browsing,
  // yet aria-describedby still reads its text on focus: a node referenced
  // directly by describedby contributes to the description even when hidden.
  return (
    <span className='group relative inline-flex'>
      <button
        type='button'
        aria-describedby={id}
        className={cn('inline-flex cursor-default items-center gap-1', className)}
      >
        {label}
        <svg
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth={2}
          strokeLinecap='round'
          strokeLinejoin='round'
          aria-hidden='true'
          className='size-3 shrink-0 text-text-muted transition-colors group-hover:text-text-secondary'
        >
          <circle cx='12' cy='12' r='10' />
          <path d='M12 16v-4' />
          <path d='M12 8h.01' />
        </svg>
      </button>
      <span id={id} aria-hidden='true' className={cn(TOOLTIP_CLASS, side === 'right' ? 'right-0' : 'left-0')}>
        {text}
      </span>
    </span>
  );
}
