import { InteropAddressProvider } from '@wonderland/interop-addresses';
import { parseBinaryForDisplay, parseHumanReadableForDisplay } from './demo-helpers';
import type { ChainType } from '../types';
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

export async function convertFromAddress(
  address: string,
  chainType: ChainType,
  chainReference: string,
): Promise<ConversionResult> {
  const binary = await InteropAddressProvider.buildFromPayload({
    version: 1,
    chainType,
    chainReference,
    address,
  });

  // Demo-Purpose only: Convert binary to human readable
  const humanReadable = await InteropAddressProvider.binaryToHumanReadable(binary);
  const parsedHumanParts = parseHumanReadableForDisplay(humanReadable);
  const humanParts = {
    ...parsedHumanParts,
    name: address, // Preserve the original input (ENS name if applicable)
  };
  const binaryParts = parseBinaryForDisplay(binary);

  return {
    humanReadable,
    binary,
    humanParts,
    binaryParts,
  };
}
