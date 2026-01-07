import { decodeInteroperableAddress } from '@wonderland/interop-addresses';
import { toHex } from 'viem';

export interface ParsedBinary {
  version: string;
  chainTypeHex: string;
  chainRefLength: string;
  chainRefHex: string;
  addressLength: string;
  addressHex: string;
}

export interface ParsedHumanReadable {
  name: string;
  chainType: string;
  chainReference: string;
  checksum: string;
}

/**
 * Parses a binary hex string into display components using the addresses package.
 * Uses decodeInteroperableAddress to parse the binary format, then formats for display.
 */
export function parseBinaryForDisplay(binaryHex: string): ParsedBinary {
  // Decode using the package function (ensure it's a Hex type)
  const interopAddress = decodeInteroperableAddress(binaryHex as `0x${string}`);

  // Format version (2 bytes)
  const versionHex = toHex(interopAddress.version, { size: 2 }).slice(2);

  // Format chainType (2 bytes)
  const chainTypeHex = toHex(interopAddress.chainType, { size: 2 }).slice(2);

  // Format chainReference length and hex
  const chainRefLength = interopAddress.chainReference.length;
  const chainRefLengthHex = chainRefLength.toString(16).padStart(2, '0');
  const chainRefHex = toHex(interopAddress.chainReference).slice(2);

  // Format address length and hex
  const addressLength = interopAddress.address.length;
  const addressLengthHex = addressLength.toString(16).padStart(2, '0');
  const addressHex = toHex(interopAddress.address).slice(2);

  return {
    version: versionHex,
    chainTypeHex,
    chainRefLength: `${chainRefLengthHex} (${chainRefLength}b)`,
    chainRefHex,
    addressLength: `${addressLengthHex} (${addressLength}b)`,
    addressHex,
  };
}
