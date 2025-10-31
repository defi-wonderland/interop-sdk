import { HumanReadablePartKey, type AddressResult, type HumanReadablePart } from '../types';
import { FormatDisplay, type FieldConfig } from './FormatDisplay';
import { HoverableFields } from './HoverableField';

interface HumanReadableDisplayProps {
  result: AddressResult;
  hoveredPart: HumanReadablePart;
  setHoveredPart: (part: HumanReadablePart) => void;
  copied: boolean;
  onCopy: () => void;
}

const fields: FieldConfig<HumanReadablePartKey, AddressResult>[] = [
  {
    key: HumanReadablePartKey.NAME,
    label: 'Address',
    getValue: (r) => r.name,
    getDisplayValue: (r) => r.name,
    description: 'Blockchain address or ENS name',
  },
  {
    key: HumanReadablePartKey.CHAIN_TYPE,
    label: 'Chain Type',
    getValue: (r) => r.chainType,
    getDisplayValue: (r) => r.chainType,
    description: 'Namespace identifier (eip155 for EVM chains)',
  },
  {
    key: HumanReadablePartKey.CHAIN_REF,
    label: 'Chain Reference',
    getValue: (r) => r.chainReference,
    getDisplayValue: (r) => r.chainReference,
    description: 'Specific chain ID',
  },
  {
    key: HumanReadablePartKey.CHECKSUM,
    label: 'Checksum',
    getValue: (r) => r.checksum,
    getDisplayValue: (r) => r.checksum,
    description: '8-character checksum',
  },
];

export function HumanReadableDisplay({
  result,
  hoveredPart,
  setHoveredPart,
  copied,
  onCopy,
}: HumanReadableDisplayProps) {
  const renderInline = () => {
    const inlineFields = fields.map((f) => ({
      label: f.label,
      value: f.getValue(result) || '',
      key: f.key,
    }));
    return <HoverableFields fields={inlineFields} hoveredPart={hoveredPart} onPartHover={setHoveredPart} />;
  };

  return (
    <FormatDisplay
      title='Human-Readable Format'
      description='A human-friendly format for cross-chain addresses with checksum validation'
      result={result}
      fields={fields}
      hoveredPart={hoveredPart}
      setHoveredPart={setHoveredPart}
      color='accent'
      renderInlineDisplay={renderInline}
      gridCols='grid-cols-1 sm:grid-cols-2'
      copied={copied}
      onCopy={onCopy}
      showCopyButton
    />
  );
}
