/**
 * Valid Interopable Address Examples
 * Format: address@chainNamespace:chainReference#CHECKSUM
 *
 * Note: These examples showcase different capabilities:
 * - Hex addresses and ENS name resolution
 * - Numeric chain IDs and chain shortnames
 * - Explicit namespace or implicit (defaults to eip155)
 * - Checksum is optional but recommended for validation
 */

export const VALID_EXAMPLES = [
  // Vitalik's address on Ethereum Mainnet (without checksum)
  '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1',

  // Vitalik's address using ENS name with chain label (simpler format)
  'vitalik.eth@eth#4CA88C9C',

  // Example address on Arbitrum using chain shortname
  '0x1234567890123456789012345678901234567890@eip155:arb1#2764FAA1',
];

export const EXAMPLE_DESCRIPTIONS: Record<string, string> = {
  [VALID_EXAMPLES[0]]: '0xd8dA...6045@eip155:1',
  [VALID_EXAMPLES[1]]: 'vitalik.eth@eth',
  [VALID_EXAMPLES[2]]: '0x1234...7890@eip155:arb1',
};
