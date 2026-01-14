export enum InputMode {
  READABLE = 'readable',
  BUILD = 'build',
}

export enum ChainType {
  EIP155 = 'eip155',
}

export enum InteroperableNamePartKey {
  NAME = 'name',
  CHAIN_TYPE = 'chainType',
  CHAIN_REF = 'chainRef',
  CHECKSUM = 'checksum',
}

export type InteroperableNamePart = InteroperableNamePartKey | null;

export enum BinaryPartKey {
  VERSION = 'version',
  CHAIN_TYPE = 'chainType',
  CHAIN_REF_LENGTH = 'chainRefLength',
  CHAIN_REF = 'chainRef',
  ADDRESS_LENGTH = 'addressLength',
  ADDRESS = 'address',
}

export type BinaryPart = BinaryPartKey | null;

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
}

export interface FieldCardProps {
  label: string;
  value: string | React.ReactNode;
  description: string;
  hovered?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  className?: string;
  color?: 'accent' | 'success' | 'info';
}
