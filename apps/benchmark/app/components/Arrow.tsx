interface ArrowProps {
  onSwap?: () => void;
  spinKey?: number;
}

export function Arrow({ onSwap, spinKey = 0 }: ArrowProps) {
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
      aria-label='swap from and to chains'
      className='cursor-pointer select-none font-sans text-xl leading-none text-text-muted transition-colors hover:text-text-primary active:scale-90'
    >
      <span key={spinKey} className='animate-spin-once inline-block'>
        →
      </span>
    </button>
  );
}
