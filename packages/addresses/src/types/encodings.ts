import { Hex } from "viem";

import { ChainTypeName } from "../internal.js";

type Brand<K, T> = K & { __brand: T };

export type HexEncodedString = Hex;
export type Base58EncodedString = Brand<string, "Base58EncodedString">;
export type Base64EncodedString = Brand<string, "Base64EncodedString">;

// ChainType is always encoded as a hex string
export type EncodedChainType = HexEncodedString;

// ChainReference is encoded as a number, base58 string, or base64 string depending on the chain type
export type EncodedChainReference<T extends ChainTypeName> = T extends "eip155"
    ? number
    : T extends "solana"
      ? Base58EncodedString
      : never;

export type ENSName = Brand<string, "ENSName">;

// Address is encoded as a hex string, base58 string, or base64 string depending on the chain type
export type EncodedAddress<T extends ChainTypeName> = T extends "eip155"
    ? HexEncodedString | ENSName
    : T extends "solana"
      ? Base58EncodedString
      : never;
