'use client';

import { useCrossChainStore } from '../stores/crossChainStore';
import { BoltIcon } from './icons';

interface SubmissionModeSwitchProps {
  disabled?: boolean;
}

export function SubmissionModeSwitch({ disabled = false }: SubmissionModeSwitchProps) {
  const submissionMode = useCrossChainStore((s) => s.submissionMode);
  const setSubmissionMode = useCrossChainStore((s) => s.setSubmissionMode);
  const isGasless = submissionMode === 'gasless';

  const handleToggle = () => {
    setSubmissionMode(isGasless ? 'user-transaction' : 'gasless');
  };

  return (
    <div className='flex items-center justify-between px-3 py-2.5 rounded-xl bg-background/40 border border-border/40'>
      <div className='flex items-center gap-2'>
        <BoltIcon className='w-3.5 h-3.5 text-accent' />
        <span className='text-sm font-medium text-text-primary'>Off-chain signature</span>
      </div>
      <button
        type='button'
        role='switch'
        aria-checked={isGasless}
        aria-label='Toggle off-chain signature'
        disabled={disabled}
        onClick={handleToggle}
        className={`relative inline-flex items-center w-9 h-5 rounded-full transition-colors duration-200 ${
          isGasless ? 'bg-accent' : 'bg-background/80 border border-border/60'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            isGasless ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}
