import type { FieldCardProps } from '../types';

export function FieldCard({
  label,
  value,
  description,
  hovered = false,
  onMouseEnter,
  onMouseLeave,
  className = '',
  color = 'accent',
}: FieldCardProps) {
  const colorClasses = {
    accent: {
      border: 'border-accent',
      bg: 'bg-accent/10',
      shadow: 'shadow-accent/20',
      text: 'text-accent',
    },
    success: {
      border: 'border-success',
      bg: 'bg-success/10',
      shadow: 'shadow-success/20',
      text: 'text-success',
    },
    info: {
      border: 'border-blue-500',
      bg: 'bg-blue-500/10',
      shadow: 'shadow-blue-500/20',
      text: 'text-blue-500',
    },
  };

  const colors = colorClasses[color] || colorClasses.accent;

  return (
    <div
      className={`bg-surface/40 backdrop-blur rounded-xl p-3 border transition-all ${
        onMouseEnter ? 'cursor-default' : ''
      } ${
        hovered ? `${colors.border} ${colors.bg} shadow-lg ${colors.shadow} scale-105` : 'border-border/30'
      } ${className}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className='text-xs text-text-tertiary mb-1'>{label}</div>
      <div className={`font-mono ${colors.text} font-bold text-sm mb-1 break-all`}>{value}</div>
      <div className='text-xs text-text-secondary'>{description}</div>
    </div>
  );
}
