'use client';

interface SegmentedToggleOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedToggleProps<T extends string> {
  options: readonly SegmentedToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  disabled?: boolean;
}

export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  disabled = false,
}: SegmentedToggleProps<T>) {
  return (
    <div
      className='inline-flex items-center rounded-full bg-surface-secondary p-1'
      role='radiogroup'
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            role='radio'
            aria-checked={isActive}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-1 ${
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            } ${isActive ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
