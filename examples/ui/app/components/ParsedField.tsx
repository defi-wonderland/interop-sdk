import type { ReactNode } from 'react';

interface ParsedFieldProps {
  label: string;
  value: ReactNode;
}

export function ParsedField({ label, value }: ParsedFieldProps) {
  return (
    <div className='flex flex-col gap-1.5 p-3 bg-background rounded-xl border border-border'>
      <span className='text-[11px] font-sans font-medium text-text-muted uppercase tracking-wider'>{label}</span>
      <span className='text-sm font-medium text-text-primary break-all'>{value}</span>
    </div>
  );
}
