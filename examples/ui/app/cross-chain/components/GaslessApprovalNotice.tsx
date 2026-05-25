import { InfoIcon } from './icons';

export function GaslessApprovalNotice() {
  return (
    <div className='flex items-start gap-2 px-3 py-2 rounded-lg bg-background/40 border border-border/40'>
      <InfoIcon className='w-3.5 h-3.5 shrink-0 mt-0.5 text-accent' />
      <p className='text-xs text-text-secondary leading-relaxed'>
        First gasless swap of a token may need a one-time on-chain approval. That step still costs gas; later swaps with
        the same token only require a signature.
      </p>
    </div>
  );
}
