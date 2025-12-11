import { buildFromPayload } from '@wonderland/interop-addresses';

/**
 * Converts a hex address to EIP-7930 interoperable address format
 */
export async function toInteropAddress(address: string, chainId: number): Promise<string> {
  const interopAddress = await buildFromPayload({
    version: 1,
    chainType: 'eip155',
    chainReference: chainId.toString(),
    address: address as `0x${string}`,
  });
  return interopAddress;
}
