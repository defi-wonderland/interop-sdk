interface HoverableFieldProps {
  label: string;
  value: string;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export function HoverableField({ label, value, isHovered, onMouseEnter, onMouseLeave }: HoverableFieldProps) {
  return (
    <span
      className={`transition-all px-2 py-1 rounded cursor-default ${
        isHovered ? 'bg-accent/20 ring-2 ring-accent' : 'hover:bg-accent/10'
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      title={label}
    >
      {value}
    </span>
  );
}

interface HoverableFieldsProps<T extends string> {
  fields: Array<{
    label: string;
    value: string;
    key: T;
  }>;
  hoveredPart: T | null;
  onPartHover: (part: T | null) => void;
}

const SEPARATORS = ['@', ':', '#'];

export function HoverableFields<T extends string>({ fields, hoveredPart, onPartHover }: HoverableFieldsProps<T>) {
  const nonEmptyFields = fields.filter((field) => !!field.value);

  return (
    <>
      {nonEmptyFields.map((field, index) => (
        <span key={field.key}>
          <HoverableField
            label={field.label}
            value={field.value}
            isHovered={hoveredPart === field.key}
            onMouseEnter={() => onPartHover(field.key)}
            onMouseLeave={() => onPartHover(null)}
          />
          {index < nonEmptyFields.length - 1 && <span className='text-text-secondary mx-1'>{SEPARATORS[index]}</span>}
        </span>
      ))}
    </>
  );
}
