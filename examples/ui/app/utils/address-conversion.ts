import { InteropAddressProvider } from '@wonderland/interop-addresses';
import { parseBinaryForDisplay, parseHumanReadableForDisplay } from './demo-helpers';
import type { ParsedBinary, ParsedHumanReadable } from './demo-helpers';

export interface ConversionResult {
  humanReadable: string;
  binary: string;
  humanParts: ParsedHumanReadable;
  binaryParts: ParsedBinary;
}

export async function convertFromReadable(humanReadableAddress: string): Promise<ConversionResult> {
  const binary = await InteropAddressProvider.humanReadableToBinary(humanReadableAddress);
  const humanParts = parseHumanReadableForDisplay(humanReadableAddress);
  const binaryParts = parseBinaryForDisplay(binary);

  return {
    humanReadable: humanReadableAddress,
    binary,
    humanParts,
    binaryParts,
  };
}
