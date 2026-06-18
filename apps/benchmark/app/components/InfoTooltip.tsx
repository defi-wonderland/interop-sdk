'use client';

import { useCallback, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '~/lib/cn';

interface InfoTooltipProps {
  /** Visible column label. */
  label: string;
  /** Plain-language explanation shown on hover or focus. */
  text: string;
  /** Extra classes for the trigger (e.g. to inherit a cell's label styling). */
  className?: string;
}

// Gap kept between the popover and whatever clips it (the viewport edge on
// mobile cards, the table's horizontal scroll box on desktop).
const EDGE_GAP = 8;

// Centered under the trigger; the inline transform nudges it horizontally so it
// never crosses its clipping box. Width is capped so long copy wraps instead of
// pushing the popover off-screen.
const TOOLTIP_CLASS =
  'pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max max-w-[15rem] whitespace-normal border ' +
  'border-border bg-surface-elevated px-2.5 py-1.5 text-left font-sans text-mark normal-case leading-snug ' +
  'tracking-normal text-text-secondary opacity-0 shadow-lg transition-opacity duration-150 ' +
  'group-hover:opacity-100 group-focus-within:opacity-100';

// Inner edges of the nearest horizontally-clipping ancestor, clamped to the
// viewport. This is what the popover must stay inside of, wherever it renders.
function clipEdges(node: HTMLElement): { left: number; right: number } {
  let left = 0;
  let right = window.innerWidth;
  for (let el = node.parentElement; el; el = el.parentElement) {
    const overflowX = getComputedStyle(el).overflowX;
    if (overflowX === 'auto' || overflowX === 'hidden' || overflowX === 'scroll') {
      const rect = el.getBoundingClientRect();
      left = Math.max(left, rect.left);
      right = Math.min(right, rect.right);
    }
  }
  return { left, right };
}

export function InfoTooltip({ label, text, className }: InfoTooltipProps): ReactNode {
  // useId keeps the trigger/tooltip association unique even when several tables
  // render the same column keys on one page.
  const id = useId();
  const popoverRef = useRef<HTMLSpanElement>(null);
  const [shift, setShift] = useState(0);

  // On open, measure where the centered popover lands and shift it back inside
  // its clipping box by exactly the overflow amount (Floating UI's shift idea).
  // Decided here, not by the caller, so it's correct in any column or table.
  const reposition = useCallback(() => {
    const pop = popoverRef.current;
    if (!pop) return;
    const rect = pop.getBoundingClientRect();
    const { left, right } = clipEdges(pop);
    // Strip the current shift to recover the natural centered edges.
    const naturalLeft = rect.left - shift;
    const naturalRight = rect.right - shift;
    let next = 0;
    if (naturalRight > right - EDGE_GAP) next = right - EDGE_GAP - naturalRight;
    if (naturalLeft + next < left + EDGE_GAP) next = left + EDGE_GAP - naturalLeft;
    setShift(next);
  }, [shift]);

  // The tooltip lives outside the button so the button's accessible name stays
  // the label alone. It's aria-hidden so screen readers skip it while browsing,
  // yet aria-describedby still reads its text on focus: a node referenced
  // directly by describedby contributes to the description even when hidden.
  return (
    <span className='group relative inline-flex' onPointerEnter={reposition} onFocus={reposition}>
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
      <span
        ref={popoverRef}
        id={id}
        aria-hidden='true'
        className={TOOLTIP_CLASS}
        style={{ transform: `translateX(calc(-50% + ${shift}px))` }}
      >
        {text}
      </span>
    </span>
  );
}
