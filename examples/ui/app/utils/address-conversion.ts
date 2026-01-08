import {
  encodeInteroperableAddress,
  parseInteroperableName,
  type ParsedInteroperableNameResult,
} from '@wonderland/interop-addresses';
import { parseInteroperableAddressForDisplay } from './demo-helpers';
import type { ParsedBinary, ParsedHumanReadable } from './demo-helpers';

export interface ConversionResult {
  humanReadable: string;
  binary: string;
  humanParts: ParsedHumanReadable;
  binaryParts: ParsedBinary;
  parsedResult: ParsedInteroperableNameResult;
}

export async function convertFromReadable(interoperableName: string): Promise<ConversionResult> {
  const parsed = await parseInteroperableName(interoperableName);
  const binary = encodeInteroperableAddress(parsed.address, { format: 'hex' });
  const binaryParts = parseInteroperableAddressForDisplay(parsed.address);

  // Map parseInteroperableName result to ParsedHumanReadable format
  const humanParts: ParsedHumanReadable = {
    name: parsed.name.address || '',
    chainType: parsed.name.chainType || '',
    chainReference: parsed.name.chainReference || '',
    checksum: parsed.name.checksum || '',
  };

  return {
    humanReadable: interoperableName,
    binary,
    humanParts,
    binaryParts,
    parsedResult: parsed,
  };
}
