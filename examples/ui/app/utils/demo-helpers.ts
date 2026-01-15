import { isBinaryAddress, toBinaryRepresentation } from '@wonderland/interop-addresses';
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

export interface ParsedInteroperableName {
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
  // Convert to binary if needed
  const binaryAddr = isBinaryAddress(interopAddress) ? interopAddress : toBinaryRepresentation(interopAddress);

  // Format version (2 bytes)
  const versionHex = toHex(binaryAddr.version, { size: 2 }).slice(2);

  // Format chainType (2 bytes)
  const chainTypeHex = toHex(binaryAddr.chainType, { size: 2 }).slice(2);

  // Format chainReference length and hex
  const chainRefBinary = binaryAddr.chainReference ?? new Uint8Array();
  const chainRefLength = chainRefBinary.length;
  const chainRefLengthHex = chainRefLength.toString(16).padStart(2, '0');
  const chainRefHex = chainRefBinary.length > 0 ? toHex(chainRefBinary).slice(2) : '';

  // Format address length and hex
  const addressBinary = binaryAddr.address ?? new Uint8Array();
  const addressLength = addressBinary.length;
  const addressLengthHex = addressLength.toString(16).padStart(2, '0');
  const addressHex = addressBinary.length > 0 ? toHex(addressBinary).slice(2) : '';

  return {
    version: versionHex,
    chainTypeHex,
    chainRefLength: `${chainRefLengthHex} (${chainRefLength}b)`,
    chainRefHex,
    addressLength: `${addressLengthHex} (${addressLength}b)`,
    addressHex,
  };
}
