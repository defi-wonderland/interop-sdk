interface InfoTooltipProps {
  /** Visible column label. */
  label: string;
  /** Plain-language explanation shown on hover or focus. */
  text: string;
  /** Unique id linking the trigger to its tooltip for screen readers. */
  id: string;
}

// Anchored to the right edge and dropped below the header so it stays inside the
// table's overflow container instead of getting clipped above the first row.
const TOOLTIP_CLASS =
  'pointer-events-none absolute right-0 top-full z-20 mt-2 w-max max-w-[15rem] whitespace-normal border ' +
  'border-border bg-surface-elevated px-2.5 py-1.5 text-left font-sans text-mark normal-case leading-snug ' +
  'tracking-normal text-text-secondary opacity-0 shadow-lg transition-opacity duration-150 ' +
  'group-hover:opacity-100 group-focus-visible:opacity-100';

export function InfoTooltip({ label, text, id }: InfoTooltipProps) {
  return (
    <button
      type='button'
      aria-describedby={id}
      className='group relative inline-flex cursor-default items-center gap-1'
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
      <span id={id} role='tooltip' className={TOOLTIP_CLASS}>
        {text}
      </span>
    </button>
  );
}
