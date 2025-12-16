/**
 * Unified Interoperable Address Examples
 * Format: address@chainNamespace:chainReference#CHECKSUM
 *
 * Note: These examples showcase different capabilities:
 * - Hex addresses and ENS name resolution
 * - Numeric chain IDs and chain shortnames
 * - Explicit namespace or implicit (defaults to eip155)
 * - Checksum is optional but recommended for validation
 */

export const EXAMPLES = [
  {
    humanReadable: 'vitalik.eth@eth',
    address: 'vitalik.eth',
    chainReference: 'eth',
    description: 'vitalik.eth (Ethereum Mainnet)',
  },
  {
    humanReadable: 'nick.eth@arb1',
    address: 'nick.eth',
    chainReference: 'arb1',
    description: 'nick.eth (Arbitrum One)',
  },
  {
    humanReadable: '0x1234567890AbcdEF1234567890aBcdef12345678@eip155:1',
    address: '0x1234567890AbcdEF1234567890aBcdef12345678',
    chainReference: '1',
    description: '0x1234...5678 (Ethereum Mainnet)',
  },
];
