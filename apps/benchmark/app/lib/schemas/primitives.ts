import { isAddress, isHash, isHex } from 'viem';
import { z } from 'zod';
import type { Address, Hash, Hex } from 'viem';

export const AddressSchema = z.custom<Address>((value) => typeof value === 'string' && isAddress(value), {
  message: 'Invalid EVM address',
});

export const HashSchema = z.custom<Hash>((value) => typeof value === 'string' && isHash(value), {
  message: 'Invalid 32-byte hash',
});

export const HexSchema = z.custom<Hex>((value) => typeof value === 'string' && isHex(value), {
  message: 'Invalid hex string',
});
