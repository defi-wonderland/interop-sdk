'use client';

import { EXECUTION_STATUS } from '../../types/execution';
import { ErrorView } from './ErrorView';
import { ProgressView } from './ProgressView';
import { SuccessView } from './SuccessView';
import type { IntentTrackingProps } from './types';

/**
 * Intent tracking progress component
 * Shows different views based on the intent execution state
 */
export function IntentTracking({ state, onReset }: IntentTrackingProps) {
  const isComplete = state.status === EXECUTION_STATUS.FILLED;
  const isError = state.status === EXECUTION_STATUS.ERROR || state.status === EXECUTION_STATUS.EXPIRED;

  if (isComplete) {
    return <SuccessView state={state} onReset={onReset} />;
  }

  if (isError) {
    return <ErrorView state={state} onReset={onReset} />;
  }

  return <ProgressView state={state} />;
}
