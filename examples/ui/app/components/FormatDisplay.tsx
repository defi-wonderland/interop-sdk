import { FieldCard } from './FieldCard';
import { CheckmarkIcon, CopyIcon } from './icons/Icons';

export interface FieldConfig<T extends string, R = unknown> {
  key: T;
  label: string;
  getValue: (result: R) => string | null;
  getDisplayValue: (result: R) => string | React.ReactNode;
  description: string;
  className?: string;
}

interface FormatDisplayProps<T extends string, R = unknown> {
  title: string;
  description: string;
  result: R;
  fields: FieldConfig<T, R>[];
  hoveredPart: T | null;
  setHoveredPart: (part: T | null) => void;
  color: 'accent' | 'success';
  renderInlineDisplay?: (
    fields: FieldConfig<T, R>[],
    result: R,
    hoveredPart: T | null,
    setHoveredPart: (part: T | null) => void,
  ) => React.ReactNode;
  gridCols?: string;
  copied?: boolean;
  onCopy?: () => void;
  showCopyButton?: boolean;
}

const colorClasses = {
  accent: {
    gradient: 'from-accent-light/40 to-accent-light/20',
    border: 'border-accent/20',
    glow: 'bg-accent/10',
    glowPosition: 'top-0 right-0 -translate-y-32 translate-x-32',
    text: 'text-accent',
    gradientBar: 'from-accent to-accent-hover',
    hoverBorder: 'hover:border-accent/50',
  },
  success: {
    gradient: 'from-success-light/40 to-success-light/20',
    border: 'border-success/20',
    glow: 'bg-success/10',
    glowPosition: 'top-0 left-0 -translate-y-32 -translate-x-32',
    text: 'text-success',
    gradientBar: 'from-success to-success/70',
    hoverBorder: 'hover:border-success/50',
  },
};

export function FormatDisplay<T extends string, R = unknown>({
  title,
  description,
  result,
  fields,
  hoveredPart,
  setHoveredPart,
  color,
  renderInlineDisplay,
  gridCols = 'grid-cols-1 sm:grid-cols-2',
  copied,
  onCopy,
  showCopyButton = false,
}: FormatDisplayProps<T, R>) {
  const colors = colorClasses[color];

  const enrichedFields = fields.map((field) => ({
    key: field.key,
    label: field.label,
    value: field.getDisplayValue(result),
    description: field.description,
    className: field.className,
    color,
    hovered: hoveredPart === field.key,
    onMouseEnter: () => setHoveredPart(field.key),
    onMouseLeave: () => setHoveredPart(null),
  }));

  return (
    <div
      className={`relative backdrop-blur-xl bg-gradient-to-br ${colors.gradient} rounded-3xl border ${colors.border} p-6 shadow-2xl overflow-hidden group`}
    >
      <div
        className={`absolute ${colors.glowPosition} w-64 h-64 ${colors.glow} rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700`}
      />

      <div className='relative flex flex-col gap-4'>
        <div>
          <h3 className={`text-lg font-bold ${colors.text} flex items-center gap-2 mb-2`}>
            <div className={`w-1.5 h-6 bg-gradient-to-b ${colors.gradientBar} rounded-full`} />
            {title}
          </h3>
          <p className='text-sm text-text-secondary'>{description}</p>
        </div>

        <div
          className={`relative bg-surface/60 backdrop-blur rounded-2xl p-4 ${showCopyButton ? 'pr-12' : ''} font-mono text-sm break-all border border-border/30 ${colors.hoverBorder} transition-colors`}
        >
          {showCopyButton && copied !== undefined && onCopy && (
            <button
              onClick={onCopy}
              className={`absolute top-1/2 -translate-y-1/2 right-3 p-2 rounded-lg bg-${color}/10 hover:bg-${color}/20 border border-${color}/30 hover:border-${color} transition-all hover:scale-110 cursor-pointer`}
              title='Copy to clipboard'
            >
              {copied ? <CheckmarkIcon /> : <CopyIcon />}
            </button>
          )}
          {renderInlineDisplay && renderInlineDisplay(fields, result, hoveredPart, setHoveredPart)}
        </div>

        <div className={`grid ${gridCols} gap-3`}>
          {enrichedFields.map(({ key, ...props }) => (
            <FieldCard key={key} {...props} />
          ))}
        </div>
      </div>
    </div>
  );
}
