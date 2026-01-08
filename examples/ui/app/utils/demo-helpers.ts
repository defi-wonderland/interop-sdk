import { toHex } from 'viem';
import type { InteroperableAddress } from '@wonderland/interop-addresses';

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
 * Parses an InteroperableAddress object into display components.
 * Formats the binary address structure for display purposes.
 */
export function parseInteroperableAddressForDisplay(interopAddress: InteroperableAddress): ParsedBinary {
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
