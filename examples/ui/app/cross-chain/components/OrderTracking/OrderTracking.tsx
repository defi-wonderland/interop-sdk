'use client';

import { STEP } from '../../types/execution';
import { ErrorView } from './ErrorView';
import { ProgressView } from './ProgressView';
import { SuccessView } from './SuccessView';
import type { OrderTrackingProps } from './types';

export function OrderTracking({ state, onReset, skipApproval }: OrderTrackingProps) {
  switch (state.step) {
    case STEP.IDLE:
      return null;
    case STEP.WALLET:
    case STEP.TRACKING:
      return <ProgressView state={state} skipApproval={skipApproval} />;
    case STEP.DONE:
      return <SuccessView state={state} onReset={onReset} />;
    case STEP.TIMEOUT:
    case STEP.ERROR:
      return <ErrorView state={state} onReset={onReset} />;
  }
}
