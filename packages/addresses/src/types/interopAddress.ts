export type InteropAddress = {
    version: number;
    chainType: ChainType;
    chainReference: ChainReference;
    address: Address;
};

export type ChainType = Uint8Array;

export type ChainReference = Uint8Array;

export type Address = Uint8Array;
