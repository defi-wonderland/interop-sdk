'use client';

import { useCrossChainStore } from '../stores/crossChainStore';
import type { SubmissionMode } from '@wonderland/interop-cross-chain';

interface SubmissionModeSwitchProps {
  disabled?: boolean;
}

const OPTIONS: { value: SubmissionMode; label: string }[] = [
  { value: 'user-transaction', label: 'Transactions' },
  { value: 'gasless', label: 'Gasless' },
];

export function SubmissionModeSwitch({ disabled = false }: SubmissionModeSwitchProps) {
  const submissionMode = useCrossChainStore((s) => s.submissionMode);
  const setSubmissionMode = useCrossChainStore((s) => s.setSubmissionMode);
  const activeIndex = OPTIONS.findIndex((o) => o.value === submissionMode);

  return (
    <div
      className='relative flex items-center rounded-full bg-surface-secondary p-1'
      role='radiogroup'
      aria-label='Submission mode selection'
    >
      <div
        className='absolute top-1 bottom-1 rounded-full bg-accent transition-all duration-200 ease-out'
        style={{
          width: 'calc(50% - 4px)',
          left: activeIndex === 0 ? '4px' : 'calc(50% + 2px)',
        }}
      />
      {OPTIONS.map(({ value, label }) => {
        const isActive = value === submissionMode;
        return (
          <button
            key={value}
            role='radio'
            aria-checked={isActive}
            disabled={disabled}
            onClick={() => setSubmissionMode(value)}
            className={`relative z-10 flex-1 px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-1 ${
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            } ${isActive ? 'text-white' : 'text-text-secondary hover:text-text-primary'}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
