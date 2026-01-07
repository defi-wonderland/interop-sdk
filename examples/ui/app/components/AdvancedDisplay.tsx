import { FormatDisplay, type FieldConfig } from './FormatDisplay';
import type { ParsedInteroperableNameResult } from '@wonderland/interop-addresses';

interface AdvancedDisplayProps {
  parsedResult: ParsedInteroperableNameResult;
}

type AdvancedFieldKey =
  | 'text-version'
  | 'text-chainType'
  | 'text-chainReference'
  | 'text-address'
  | 'meta-checksum'
  | 'meta-checksumMismatch'
  | 'meta-isENS'
  | 'meta-isChainLabel';

const fields: FieldConfig<AdvancedFieldKey, ParsedInteroperableNameResult>[] = [
  {
    key: 'text-version',
    label: 'Text: Version',
    getValue: (r) => r.text.version?.toString() || null,
    getDisplayValue: (r) => r.text.version?.toString() || <span className='text-text-tertiary italic'>(not set)</span>,
    description: 'CAIP-350 text format version',
  },
  {
    key: 'text-chainType',
    label: 'Text: Chain Type',
    getValue: (r) => r.text.chainType || null,
    getDisplayValue: (r) => r.text.chainType || <span className='text-text-tertiary italic'>(not set)</span>,
    description: 'Chain namespace (e.g., eip155, solana)',
  },
  {
    key: 'text-chainReference',
    label: 'Text: Chain Reference',
    getValue: (r) => r.text.chainReference || null,
    getDisplayValue: (r) => r.text.chainReference || <span className='text-text-tertiary italic'>(not set)</span>,
    description: 'Chain identifier (numeric ID or label)',
  },
  {
    key: 'text-address',
    label: 'Text: Address',
    getValue: (r) => r.text.address || null,
    getDisplayValue: (r) => r.text.address || <span className='text-text-tertiary italic'>(not set)</span>,
    description: 'Resolved address (hex or ENS name)',
    className: 'sm:col-span-2',
  },
  {
    key: 'meta-checksum',
    label: 'Meta: Checksum',
    getValue: (r) => r.meta.checksum || null,
    getDisplayValue: (r) => r.meta.checksum || <span className='text-text-tertiary italic'>(not set)</span>,
    description: 'Calculated checksum from binary address',
  },
  {
    key: 'meta-checksumMismatch',
    label: 'Meta: Checksum Mismatch',
    getValue: (r) =>
      r.meta.checksumMismatch ? `${r.meta.checksumMismatch.provided} vs ${r.meta.checksumMismatch.calculated}` : null,
    getDisplayValue: (r) =>
      r.meta.checksumMismatch ? (
        <span className='text-orange-500'>
          Provided: {r.meta.checksumMismatch.provided} ≠ Calculated: {r.meta.checksumMismatch.calculated}
        </span>
      ) : (
        <span className='text-text-tertiary italic'>(no mismatch)</span>
      ),
    description: 'Checksum mismatch between provided and calculated values',
  },
  {
    key: 'meta-isENS',
    label: 'Meta: Is ENS',
    getValue: (r) => r.meta.isENS.toString(),
    getDisplayValue: (r) => (
      <span className={r.meta.isENS ? 'text-accent font-semibold' : 'text-text-tertiary'}>
        {r.meta.isENS ? 'Yes' : 'No'}
      </span>
    ),
    description: 'Whether the address is an ENS name',
  },
  {
    key: 'meta-isChainLabel',
    label: 'Meta: Is Chain Label',
    getValue: (r) => r.meta.isChainLabel.toString(),
    getDisplayValue: (r) => (
      <span className={r.meta.isChainLabel ? 'text-accent font-semibold' : 'text-text-tertiary'}>
        {r.meta.isChainLabel ? 'Yes' : 'No'}
      </span>
    ),
    description: 'Whether the chain reference is a label (non-numeric)',
  },
];

export function AdvancedDisplay({ parsedResult }: AdvancedDisplayProps) {
  const visibleFields = fields.filter((f) => {
    const value = f.getValue(parsedResult);
    // Show field if it has a value, or if it's a meta field that should always be shown
    return value !== null || f.key.startsWith('meta-');
  });

  return (
    <FormatDisplay
      title='Advanced: Text & Meta Fields'
      description='Raw text representation (CAIP-350) and metadata from parseInteroperableName'
      result={parsedResult}
      fields={visibleFields}
      hoveredPart={null}
      setHoveredPart={() => {}}
      color='info'
      gridCols='grid-cols-1 sm:grid-cols-2'
      showCopyButton={false}
    />
  );
}
