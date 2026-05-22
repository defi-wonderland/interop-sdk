import type { Address, TypedDataParameter } from "viem";

/**
 * Loose shape for an EIP-712 domain coming off the wire. `chainId` and
 * `verifyingContract` are not narrowed yet — providers serialize them as
 * numbers, bigints, decimal strings or 0x-prefixed hex. The envelope
 * validators normalize them.
 */
export interface Eip712Domain {
    name?: string;
    version?: string;
    chainId?: number | bigint | string;
    verifyingContract?: string;
    salt?: string;
}

export interface Eip712Envelope {
    domain: Eip712Domain;
    primaryType: string;
    types: Record<string, readonly TypedDataParameter[]>;
    message: Record<string, unknown>;
}

export interface ExpectedEnvelope {
    chainId: number;
    verifyingContracts: ReadonlyArray<Address>;
    provider: string;
}

export interface ExpectedPermit2Message {
    provider: string;
    /** Contract authorized to pull tokens via Permit2 (e.g. settler, periphery). */
    spender: Address;
    inputToken?: Address;
    maxAmount?: bigint;
    skewSeconds?: number;
}

export interface ExpectedEip3009Message {
    provider: string;
    user: Address;
    /** Authorized recipient — for `ReceiveWithAuthorization` this must equal `msg.sender`. */
    to: Address;
    maxValue?: bigint;
    skewSeconds?: number;
}

export interface PermittedEntry {
    token: Address;
    amount: bigint;
}
