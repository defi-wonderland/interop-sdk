'use server';

import { parseName, encodeAddress, type ParsedInteroperableNameResult } from '@wonderland/interop-addresses';

type ParseNameResult =
  | { success: true; parsed: ParsedInteroperableNameResult; binary: string }
  | { success: false; error: string };

/**
 * Server action to parse an interoperable name.
 * We run this server-side because ENS resolution requires an
 * RPC URL with an API key that shouldn't be exposed to the client.
 */
export async function parseNameAction(interoperableName: string): Promise<ParseNameResult> {
  try {
    const parsed = await parseName(interoperableName);
    const binary = encodeAddress(parsed.interoperableAddress, { format: 'hex' });

    return { success: true, parsed, binary };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to parse name';
    return { success: false, error: message };
  }
}
