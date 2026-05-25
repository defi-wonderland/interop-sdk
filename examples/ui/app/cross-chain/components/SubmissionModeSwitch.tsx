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

  return (
    <div className='flex border border-border/50 rounded-xl' role='tablist' aria-label='Submission mode selection'>
      {OPTIONS.map((option, index) => {
        const isActive = submissionMode === option.value;
        const isFirst = index === 0;
        const isLast = index === OPTIONS.length - 1;
        const radius = isFirst ? 'rounded-l-xl' : isLast ? 'rounded-r-xl' : '';

        return (
          <button
            key={option.value}
            type='button'
            role='tab'
            aria-selected={isActive}
            disabled={disabled}
            onClick={() => setSubmissionMode(option.value)}
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
