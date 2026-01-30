export enum InputMode {
  READABLE = 'readable',
  BUILD = 'build',
}

export enum ChainType {
  EIP155 = 'eip155',
}

export enum BinaryPartKey {
  VERSION = 'version',
  CHAIN_TYPE = 'chainType',
  CHAIN_REF_LENGTH = 'chainRefLength',
  CHAIN_REF = 'chainRef',
  ADDRESS_LENGTH = 'addressLength',
  ADDRESS = 'address',
}

export interface AddressResult {
  name: string;
  chainType: string;
  chainReference: string;
  checksum: string;
  interoperableName: string;
  version: string;
  chainTypeHex: string;
  chainRefLength: string;
  chainRefHex: string;
  addressLength: string;
  addressHex: string;
  binary: string;
  // Metadata from parsedResult
  meta: {
    resolvedAddress: string;
    isENS: boolean;
    isChainLabel: boolean;
    checksumMismatch?: { provided: string; calculated: string };
  };
}
