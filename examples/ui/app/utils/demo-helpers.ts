export interface ParsedBinary {
  version: string;
  chainTypeHex: string;
  chainRefLength: string;
  chainRefHex: string;
  addressLength: string;
  addressHex: string;
}

export interface ParsedHumanReadable {
  name: string;
  chainType: string;
  chainReference: string;
  checksum: string;
}

export function parseBinaryForDisplay(binaryHex: string): ParsedBinary {
  let pos = 2;

  const version = binaryHex.slice(pos, pos + 4);
  pos += 4;

  const chainTypeHex = binaryHex.slice(pos, pos + 4);
  pos += 4;

  const chainRefLengthHex = binaryHex.slice(pos, pos + 2);
  const chainRefLengthDec = parseInt(chainRefLengthHex, 16);
  pos += 2;

  const chainRefHex = binaryHex.slice(pos, pos + chainRefLengthDec * 2);
  pos += chainRefLengthDec * 2;

  const addressLengthHex = binaryHex.slice(pos, pos + 2);
  const addressLengthDec = parseInt(addressLengthHex, 16);
  pos += 2;

  const addressHex = binaryHex.slice(pos, pos + addressLengthDec * 2);

  return {
    version,
    chainTypeHex,
    chainRefLength: `${chainRefLengthHex} (${chainRefLengthDec}b)`,
    chainRefHex,
    addressLength: `${addressLengthHex} (${addressLengthDec}b)`,
    addressHex,
  };
}

export function parseHumanReadableForDisplay(humanReadable: string): ParsedHumanReadable {
  const parts = humanReadable.split('@');
  const name = parts[0] || '';
  const afterAt = parts[1] || '';
  const [chainPart, checksumPart] = afterAt.split('#');

  // Handle both "namespace:reference" and just "reference" (e.g., "eth")
  const colonParts = chainPart.split(':').filter(Boolean);
  const hasNamespace = colonParts.length > 1;

  const namespace = hasNamespace ? colonParts[0] : '';
  const chain = hasNamespace ? colonParts[1] : colonParts[0] || '';

  return {
    name,
    chainType: namespace,
    chainReference: chain,
    checksum: checksumPart || '',
  };
}
