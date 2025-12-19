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
    showInBuildMode: true,
    showInReadableMode: true,
  },
  {
    humanReadable: 'nick.eth@arb1',
    address: 'nick.eth',
    chainReference: 'arb1',
    description: 'nick.eth (Arbitrum One)',
    showInBuildMode: true,
    showInReadableMode: true,
  },
  {
    humanReadable: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913@eip155:8453',
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    chainReference: '8453',
    description: '0x8335...A02913 (Base)',
    showInBuildMode: false,
    showInReadableMode: true,
  },
  {
    humanReadable: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913@base',
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    chainReference: 'base',
    description: '0x8335...A02913 (Base)',
    showInBuildMode: true,
    showInReadableMode: false,
  },
];
