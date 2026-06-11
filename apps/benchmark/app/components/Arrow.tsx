interface ArrowProps {
  onSwap?: () => void;
  spinKey?: number;
  ariaLabel?: string;
}

export function Arrow({ onSwap, spinKey = 0, ariaLabel = 'swap from and to chains' }: ArrowProps) {
  if (!onSwap) {
    return (
      <span aria-hidden='true' className='cursor-default select-none font-sans text-xl leading-none text-text-muted'>
        →
      </span>
    );
  }

  return (
    <button
      type='button'
      onClick={onSwap}
      aria-label={ariaLabel}
      className='cursor-pointer select-none font-sans text-xl leading-none text-text-muted transition-colors hover:text-text-primary active:scale-90'
    >
      <span key={spinKey} className='animate-spin-once inline-block'>
        →
      </span>
    </button>
  );
}
