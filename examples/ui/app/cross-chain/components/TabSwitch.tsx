'use client';

interface TabSwitchOption<T extends string> {
  value: T;
  label: string;
}

interface TabSwitchProps<T extends string> {
  options: readonly TabSwitchOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  disabled?: boolean;
}

export function TabSwitch<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  disabled = false,
}: TabSwitchProps<T>) {
  return (
    <div className='flex border border-border/50 rounded-xl' role='group' aria-label={ariaLabel}>
      {options.map((option, index) => {
        const isActive = option.value === value;
        const isFirst = index === 0;
        const isLast = index === options.length - 1;
        const radius = isFirst ? 'rounded-l-xl' : isLast ? 'rounded-r-xl' : '';

        return (
          <button
            key={option.value}
            type='button'
            aria-pressed={isActive}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`flex-1 px-4 py-2 ${radius} text-sm font-medium transition-colors ${
              isActive ? 'bg-accent text-white' : 'bg-background/50 text-text-secondary hover:text-text-primary'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
