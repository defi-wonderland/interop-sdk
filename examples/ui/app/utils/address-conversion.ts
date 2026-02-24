import { type ParsedInteroperableNameResult } from '@wonderland/interop-addresses';
import { parseNameAction, type ParseNameActionOptions } from '../actions/parse-name';
import { parseInteroperableAddressForDisplay } from './demo-helpers';
import type { ParsedBinary, ParsedInteroperableName } from './demo-helpers';

export const NETWORK_ERROR_MESSAGE = 'Unexpected error, please try again or check your connection';

export interface ConversionResult {
  interoperableName: string;
  binary: string;
  nameParts: ParsedInteroperableName;
  binaryParts: ParsedBinary;
  parsedResult: ParsedInteroperableNameResult;
}

export interface ConversionOptions {
  /** Experimental: ENS-based chain registry domain (e.g., "cid.eth") */
  useExperimentalChainRegistry?: string;
}

export async function convertFromReadable(
  interoperableName: string,
  options?: ConversionOptions,
): Promise<ConversionResult> {
  let result;
  const parseOptions: ParseNameActionOptions | undefined = options?.useExperimentalChainRegistry
    ? { useExperimentalChainRegistry: options.useExperimentalChainRegistry }
    : undefined;

  try {
    result = await parseNameAction(interoperableName, parseOptions);
  } catch {
    throw new Error(NETWORK_ERROR_MESSAGE);
  }

  if (!result.success) {
    throw new Error(result.error);
  }

  const { parsed, binary } = result;
  const binaryParts = parseInteroperableAddressForDisplay(parsed.interoperableAddress);

  // Map parseName result to ParsedInteroperableName format
  const nameParts: ParsedInteroperableName = {
    name: parsed.name.address || '',
    chainType: parsed.name.chainType || '',
    chainReference: parsed.name.chainReference || '',
    checksum: parsed.name.checksum || '',
  };

  return {
    interoperableName,
    binary,
    nameParts,
    binaryParts,
    parsedResult: parsed,
  };
}
