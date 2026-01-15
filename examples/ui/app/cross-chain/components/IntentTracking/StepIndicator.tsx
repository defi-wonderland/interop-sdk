import { SpinnerIcon, CheckIcon, CloseIcon } from '../icons';
import type { StepStatus } from '../../utils/intentTrackingHelpers';

export function StepIndicator({ status }: { status: StepStatus }) {
  const baseClasses = 'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all';

  switch (status) {
    case 'active':
      return (
        <div className={`${baseClasses} bg-accent/20 border-2 border-accent`}>
          <SpinnerIcon />
        </div>
      );
    case 'complete':
      return (
        <div className={`${baseClasses} bg-accent text-white`}>
          <CheckIcon />
        </div>
      );
    case 'error':
      return (
        <div className={`${baseClasses} bg-error text-white`}>
          <CloseIcon />
        </div>
      );
    default:
      return <div className={`${baseClasses} bg-surface-secondary border-2 border-border`} />;
  }
}
