import { cn } from '~/lib/cn';

export type PillTone = 'accent' | 'outline' | 'muted' | 'error' | 'success';

interface PillProps {
  tone: PillTone;
  title?: string;
  className?: string;
  icon?: string;
  children: React.ReactNode;
}

const PILL_BASE =
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-caption uppercase tracking-[0.08em]';

const PILL_TONE: Record<PillTone, string> = {
  accent: 'bg-accent text-on-accent',
  outline: 'border border-accent/40 text-accent',
  muted: 'border border-border-subtle text-text-muted',
  error: 'border border-error/40 text-error',
  success: 'border border-success/40 text-success',
};

export function Pill({ tone, title, className, icon, children }: PillProps) {
  return (
    <span title={title} className={cn(PILL_BASE, PILL_TONE[tone], className)}>
      {icon ? <span aria-hidden='true'>{icon}</span> : null}
      {children}
    </span>
  );
}
