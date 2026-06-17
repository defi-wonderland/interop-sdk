import { Pill } from '../Pill';
import type { RowStatus } from './types';

interface RaceStatusPillProps {
  status: RowStatus;
  isWinner: boolean;
  isFirst: boolean;
  errorMessage?: string;
  reduceMotion: boolean;
}

// Status pill for a race row, shared by the desktop table and the mobile card so
// both render the same WINNER / FIRST / NO ROUTE / querying treatment. Returns
// null when there is nothing to show (a settled non-winner that wasn't first).
export function RaceStatusPill({
  status,
  isWinner,
  isFirst,
  errorMessage,
  reduceMotion,
}: RaceStatusPillProps): React.ReactNode {
  let pills: React.ReactNode = null;

  if (status === 'errored') {
    pills = (
      <Pill tone='error' title={errorMessage}>
        no route
      </Pill>
    );
  } else if (status === 'querying') {
    pills = (
      <Pill tone='muted' className={reduceMotion ? undefined : 'animate-pulse'}>
        querying
      </Pill>
    );
  } else if (status === 'settled' && (isWinner || isFirst)) {
    pills = (
      <>
        {isWinner ? (
          <Pill tone='accent' icon='★'>
            winner
          </Pill>
        ) : null}
        {isFirst ? <Pill tone='outline'>first</Pill> : null}
      </>
    );
  }

  if (!pills) return null;
  return <div className='flex flex-wrap items-center justify-end gap-1.5'>{pills}</div>;
}
