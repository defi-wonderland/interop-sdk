import { BinaryPartKey, type AddressResult, type BinaryPart } from '../types';
import { FormatDisplay, type FieldConfig } from './FormatDisplay';

interface BinaryFormatDisplayProps {
  result: AddressResult;
  hoveredPart: BinaryPart;
  setHoveredPart: (part: BinaryPart) => void;
}

const fields: FieldConfig<BinaryPartKey, AddressResult>[] = [
  {
    key: BinaryPartKey.VERSION,
    label: 'Version',
    getValue: (r) => r.version,
    getDisplayValue: (r) => r.version,
    description: 'Format version number',
  },
  {
    key: BinaryPartKey.CHAIN_TYPE,
    label: 'Chain Type',
    getValue: (r) => r.chainTypeHex,
    getDisplayValue: (r) => r.chainTypeHex,
    description: 'Encoded chain type (eip155 for EVM chains)',
  },
  {
    key: BinaryPartKey.CHAIN_REF_LENGTH,
    label: 'Chain Ref Length',
    getValue: (r) => r.chainRefLength.split(' ')[0],
    getDisplayValue: (r) => r.chainRefLength,
    description: 'Reference byte count',
  },
  {
    key: BinaryPartKey.CHAIN_REF,
    label: 'Chain Reference',
    getValue: (r) => r.chainRefHex || null,
    getDisplayValue: (r) => r.chainRefHex || <span className='text-text-tertiary italic'>(empty)</span>,
    description: 'Chain ID (e.g., 0x01 = mainnet)',
  },
  {
    key: BinaryPartKey.ADDRESS_LENGTH,
    label: 'Address Length',
    getValue: (r) => r.addressLength.split(' ')[0],
    getDisplayValue: (r) => r.addressLength,
    description: 'Address byte count',
  },
  {
    key: BinaryPartKey.ADDRESS,
    label: 'Address',
    getValue: (r) => r.addressHex,
    getDisplayValue: (r) => r.addressHex,
    description: 'The actual account address',
    className: 'sm:col-span-2 lg:col-span-3 scale-[1.02]',
  },
];

export function BinaryFormatDisplay({ result, hoveredPart, setHoveredPart }: BinaryFormatDisplayProps) {
  const inlineFields = fields
    .map((field) => ({
      key: field.key,
      value: field.getValue(result),
      isHovered: hoveredPart === field.key,
      onMouseEnter: () => setHoveredPart(field.key),
      onMouseLeave: () => setHoveredPart(null),
    }))
    .filter((field) => field.value);

  const renderInline = () => (
    <>
      <span className='text-text-tertiary'>0x</span>
      {inlineFields.map((field) => (
        <span
          key={field.key}
          className={`transition-all cursor-default ${field.isHovered ? 'text-success font-bold' : 'text-text-primary'}`}
          onMouseEnter={field.onMouseEnter}
          onMouseLeave={field.onMouseLeave}
        >
          {field.value}
        </span>
      ))}
    </>
  );

  return (
    <FormatDisplay
      title='Binary Format'
      description='Compact binary representation for efficient on-chain storage and processing'
      result={result}
      fields={fields}
      hoveredPart={hoveredPart}
      setHoveredPart={setHoveredPart}
      color='success'
      renderInlineDisplay={renderInline}
      gridCols='grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      showCopyButton={false}
    />
  );
}
