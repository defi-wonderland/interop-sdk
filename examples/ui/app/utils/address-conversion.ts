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
  const isValid = await InteropAddressProvider.isValidHumanReadableAddress(humanReadableAddress, {
    validateChecksumFlag: false,
  });

  if (!isValid) {
    throw new Error('Invalid interoperable address format');
  }

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
  const normalizedAddress = address.startsWith('0x') ? address : `0x${address}`;

  // TODO: SDK should accept decimal chain IDs instead of requiring hex
  const normalizedChainReference = chainReference.startsWith('0x')
    ? chainReference
    : `0x${Number(chainReference).toString(16)}`;

  const binary = await InteropAddressProvider.buildFromPayload({
    version: 1,
    chainType,
    chainReference: normalizedChainReference,
    address: normalizedAddress,
  });

  // Demo-Purpose only: Convert binary to human readable
  const humanReadable = await InteropAddressProvider.binaryToHumanReadable(binary);
  const humanParts = parseHumanReadableForDisplay(humanReadable);
  const binaryParts = parseBinaryForDisplay(binary);

  return {
    humanReadable,
    binary,
    humanParts,
    binaryParts,
  };
}
