import { cn } from '../utils/cn';

interface ConvertButtonProps {
  onClick: () => void;
  isLoading: boolean;
  className?: string;
}

export function ConvertButton({ onClick, isLoading, className }: ConvertButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        'w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-accent to-accent-hover text-white rounded-xl text-sm font-semibold',
        'hover:scale-105 transition-all shadow-lg shadow-accent/30',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
        className,
      )}
    >
      {isLoading ? 'Converting...' : 'Convert'}
    </button>
  );
}
