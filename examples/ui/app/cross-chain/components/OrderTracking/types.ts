import type { OrderExecutionState } from '../../types/execution';

export interface OrderTrackingProps {
  state: OrderExecutionState;
  onReset?: () => void;
}
