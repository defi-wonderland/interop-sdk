import {
  nameToBinary,
  parseInteroperableName,
  type ParsedInteroperableNameResult,
} from '@wonderland/interop-addresses';
import { parseBinaryForDisplay } from './demo-helpers';
import type { ParsedBinary, ParsedHumanReadable } from './demo-helpers';

export interface ConversionResult {
  humanReadable: string;
  binary: string;
  humanParts: ParsedHumanReadable;
  binaryParts: ParsedBinary;
  parsedResult: ParsedInteroperableNameResult;
}

export async function convertFromReadable(interoperableName: string): Promise<ConversionResult> {
  const binaryResult = await nameToBinary(interoperableName, { format: 'hex' });
  // Ensure binary is a hex string for display
  const binary =
    typeof binaryResult === 'string'
      ? binaryResult
      : `0x${Array.from(binaryResult)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')}`;

  const [parsed, binaryParts] = await Promise.all([
    parseInteroperableName(interoperableName),
    Promise.resolve(parseBinaryForDisplay(binary)),
  ]);

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
