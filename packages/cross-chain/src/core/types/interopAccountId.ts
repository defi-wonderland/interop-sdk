/**
 * Chain-aware account/asset identifier (EVM-focused).
 *
 * Replaces ERC-7930 binary addresses in the public SDK API with a
 * human-readable `{ chainId, address }` pair.
 *
 * @example
 * ```ts
 * const usdc: InteropAccountId = {
 *   chainId: 8453,
 *   address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
 * };
 * ```
 */
export interface InteropAccountId {
    /** EVM chain ID */
    chainId: number;
    /** EIP-55 checksummed hex address */
    address: string;
}
