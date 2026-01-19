import { encodeAddress, parseName, type ParsedInteroperableNameResult } from '@wonderland/interop-addresses';
import { parseInteroperableAddressForDisplay } from './demo-helpers';
import type { ParsedBinary, ParsedInteroperableName } from './demo-helpers';

export interface ConversionResult {
  interoperableName: string;
  binary: string;
  nameParts: ParsedInteroperableName;
  binaryParts: ParsedBinary;
  parsedResult: ParsedInteroperableNameResult;
}

export async function convertFromReadable(interoperableName: string): Promise<ConversionResult> {
  const parsed = await parseName(interoperableName);
  const binary = encodeAddress(parsed.interoperableAddress, { format: 'hex' });
  const binaryParts = parseInteroperableAddressForDisplay(parsed.interoperableAddress);

  // Map parseName result to ParsedInteroperableName format
  const nameParts: ParsedInteroperableName = {
    name: parsed.name.address || '',
    chainType: parsed.name.chainType || '',
    chainReference: parsed.name.chainReference || '',
    checksum: parsed.name.checksum || '',
  };

  return {
    interoperableName,
    binary,
    nameParts,
    binaryParts,
    parsedResult: parsed,
  };
}
