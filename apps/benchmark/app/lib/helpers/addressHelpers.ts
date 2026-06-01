import { isAddress, isHex, size, slice, type Address } from 'viem';

const ADDRESS_BYTE_LENGTH = 20;
const BYTES32_BYTE_LENGTH = 32;

export function bytes32ToAddress(value: string): Address | null {
  if (!isHex(value) || size(value) !== BYTES32_BYTE_LENGTH) return null;
  const address = slice(value, BYTES32_BYTE_LENGTH - ADDRESS_BYTE_LENGTH);
  return isAddress(address) ? address : null;
}
