import { cn } from '../utils/cn';

interface ConvertButtonProps {
  onClick: () => void;
  isLoading: boolean;
  isDisabled?: boolean;
  className?: string;
}

export function ConvertButton({ onClick, isLoading, isDisabled = false, className }: ConvertButtonProps) {
  const disabled = isLoading || isDisabled;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full h-10 bg-accent text-white rounded-full text-sm font-medium',
        'hover:bg-accent-hover transition-colors cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
    >
      {isLoading ? 'Converting...' : 'Convert →'}
    </button>
  );
}
