'use client';

import { useCrossChainStore } from '../stores/crossChainStore';
import { TabSwitch } from './TabSwitch';
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
    <TabSwitch
      options={OPTIONS}
      value={submissionMode}
      onChange={setSubmissionMode}
      ariaLabel='Submission mode selection'
      disabled={disabled}
    />
  );
}
