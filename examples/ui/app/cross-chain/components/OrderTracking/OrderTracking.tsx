'use client';

import { EXECUTION_STATUS } from '../../types/execution';
import { ErrorView } from './ErrorView';
import { ProgressView } from './ProgressView';
import { SuccessView } from './SuccessView';
import type { OrderTrackingProps } from './types';

export function OrderTracking({ state, onReset }: OrderTrackingProps) {
  const isComplete = state.status === EXECUTION_STATUS.COMPLETED;
  const isError =
    state.status === EXECUTION_STATUS.ERROR ||
    state.status === EXECUTION_STATUS.EXPIRED ||
    state.status === EXECUTION_STATUS.FAILED;
  const isTimeout = state.status === EXECUTION_STATUS.TIMEOUT;

  if (isComplete) {
    return <SuccessView state={state} onReset={onReset} />;
  }

  if (isError || isTimeout) {
    return <ErrorView state={state} onReset={onReset} />;
  }

  return <ProgressView state={state} />;
}
