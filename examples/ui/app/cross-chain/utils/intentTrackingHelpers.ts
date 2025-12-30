import { EXECUTION_STATUS, type IntentExecutionStatus } from '../types/execution';

/**
 * Visual steps for the intent execution flow
 */
export const INTENT_STEPS = [
  {
    id: 'approval',
    label: 'Approval',
    statuses: [EXECUTION_STATUS.CHECKING_APPROVAL, EXECUTION_STATUS.APPROVING] as IntentExecutionStatus[],
  },
  {
    id: 'submit',
    label: 'Submit',
    statuses: [EXECUTION_STATUS.SUBMITTING, EXECUTION_STATUS.CONFIRMING] as IntentExecutionStatus[],
  },
  {
    id: 'opening',
    label: 'Opening',
    statuses: [EXECUTION_STATUS.OPENING, EXECUTION_STATUS.OPENED] as IntentExecutionStatus[],
  },
  {
    id: 'filling',
    label: 'Filling',
    statuses: [EXECUTION_STATUS.FILLING] as IntentExecutionStatus[],
  },
] as const;

export type IntentStep = (typeof INTENT_STEPS)[number];
export type StepStatus = 'pending' | 'active' | 'complete' | 'error';

/**
 * Get step status based on current execution status
 */
export function getStepStatus(
  stepStatuses: readonly IntentExecutionStatus[],
  currentStatus: IntentExecutionStatus,
  stepIndex: number,
): StepStatus {
  if (currentStatus === EXECUTION_STATUS.ERROR) {
    const currentStepIndex = INTENT_STEPS.findIndex((s) => s.statuses.includes(currentStatus));
    if (stepIndex === currentStepIndex || (currentStepIndex === -1 && stepIndex === 0)) {
      return 'error';
    }
  }

  if (currentStatus === EXECUTION_STATUS.EXPIRED && stepStatuses.includes(EXECUTION_STATUS.FILLING)) {
    return 'error';
  }

  if (stepStatuses.includes(currentStatus)) {
    return 'active';
  }

  const currentStepIndex = INTENT_STEPS.findIndex(
    (s) =>
      s.statuses.includes(currentStatus) ||
      currentStatus === EXECUTION_STATUS.FILLED ||
      currentStatus === EXECUTION_STATUS.EXPIRED,
  );

  if (currentStepIndex > stepIndex) {
    return 'complete';
  }

  return 'pending';
}
