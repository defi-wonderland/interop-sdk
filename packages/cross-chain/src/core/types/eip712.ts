import type { Address } from "viem";

export interface Eip712Envelope {
    domain: Record<string, unknown>;
    primaryType: string;
    types: Record<string, Array<{ name: string; type: string }>>;
    message: Record<string, unknown>;
}

export interface ExpectedEnvelope {
    chainId: number;
    verifyingContracts: ReadonlyArray<Address>;
    primaryTypes: ReadonlySet<string>;
    provider: string;
}

export interface ExpectedPermit2Message {
    provider: string;
    inputToken?: Address;
    maxAmount?: bigint;
    skewSeconds?: number;
}

export interface ExpectedEip3009Message {
    provider: string;
    user: Address;
    maxValue?: bigint;
    skewSeconds?: number;
}

export interface PermittedEntry {
    token: Address;
    amount: bigint;
}
