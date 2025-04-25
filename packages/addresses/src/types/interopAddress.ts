export type InteropAddress = {
    version: number;
    chainType: Uint8Array;
    chainReference: Uint8Array;
    address: Uint8Array;
};

export type ChainType = Uint8Array;
