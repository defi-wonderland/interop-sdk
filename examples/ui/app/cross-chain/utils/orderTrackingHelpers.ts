import { EXECUTION_STATUS, type OrderExecutionStatus } from '../types/execution';

/**
 * Visual steps for the order execution flow (OIF-aligned)
 */
export const ORDER_STEPS = [
  {
    id: 'approval',
    label: 'Approval',
    statuses: [
      EXECUTION_STATUS.SWITCHING_NETWORK,
      EXECUTION_STATUS.CHECKING_APPROVAL,
      EXECUTION_STATUS.APPROVING,
    ] as OrderExecutionStatus[],
  },
  {
    id: 'submit',
    label: 'Submit',
    statuses: [EXECUTION_STATUS.SUBMITTING, EXECUTION_STATUS.CONFIRMING] as OrderExecutionStatus[],
  },
  {
    id: 'pending',
    label: 'Pending',
    statuses: [EXECUTION_STATUS.PENDING] as OrderExecutionStatus[],
  },
  {
    id: 'filling',
    label: 'Filling',
    statuses: [EXECUTION_STATUS.FILLING] as OrderExecutionStatus[],
  },
] as const;

export type OrderStep = (typeof ORDER_STEPS)[number];
export type StepStatus = 'pending' | 'active' | 'complete' | 'error';

/**
 * Get step status based on current execution status
 */
export function getStepStatus(
  stepStatuses: readonly OrderExecutionStatus[],
  currentStatus: OrderExecutionStatus,
  stepIndex: number,
): StepStatus {
  if (currentStatus === EXECUTION_STATUS.ERROR || currentStatus === EXECUTION_STATUS.FAILED) {
    const currentStepIndex = ORDER_STEPS.findIndex((s) => s.statuses.includes(currentStatus));
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

  const currentStepIndex = ORDER_STEPS.findIndex(
    (s) =>
      s.statuses.includes(currentStatus) ||
      currentStatus === EXECUTION_STATUS.COMPLETED ||
      currentStatus === EXECUTION_STATUS.EXPIRED ||
      currentStatus === EXECUTION_STATUS.FAILED,
  );

  if (currentStepIndex > stepIndex) {
    return 'complete';
  }

  return 'pending';
}
