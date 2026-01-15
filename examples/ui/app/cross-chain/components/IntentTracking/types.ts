import type { IntentExecutionState } from '../../types/execution';

export interface IntentTrackingProps {
  state: IntentExecutionState;
  onReset?: () => void;
}
