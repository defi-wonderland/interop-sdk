/**
 * Valid Interopable Address Examples
 * Format: address@chainNamespace:chainReference#CHECKSUM
 *
 * Note: These examples use real Ethereum addresses with their computed checksums.
 * The checksum is mandatory for a valid ERC-7930 interopable address.
 */

export const VALID_EXAMPLES = [
  // Vitalik's address on Ethereum Mainnet
  '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C',

  // USDC Contract on Ethereum Mainnet
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48@eip155:1#58309C26',

  // Example address on Arbitrum
  '0x1234567890123456789012345678901234567890@eip155:42161#2764FAA1',
];

export const EXAMPLE_DESCRIPTIONS: Record<string, string> = {
  [VALID_EXAMPLES[0]]: 'Ethereum Mainnet address',
  [VALID_EXAMPLES[1]]: 'USDC on Ethereum',
  [VALID_EXAMPLES[2]]: 'Arbitrum address',
};
