---
title: Interoperable Address
impact: FOUNDATION
tags: erc-7930, binary, chain-specific
---

# Interoperable Address

Binary format that binds address + chain. For on-chain/smart contract use.

Structure: `Version (2B) | ChainType (2B) | ChainRefLen (1B) | ChainRef (var) | AddrLen (1B) | Address (var)`

## Do
- ✅ Include Version (`0x0001`) at the start
- ✅ Use ChainType from CAIP-350 (`0x0000` = EVM, `0x0002` = Solana)
- ✅ Display as lowercase hex when showing to users

## Don't
- ❌ Use raw address in cross-chain contexts → ambiguous which chain
- ❌ Set both ChainRefLength=0 AND AddressLength=0 → not allowed
- ❌ Use Version other than `0x0001` → not defined yet

## Parsing byte-by-byte

Example: `0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045`

| Offset | Bytes | Field | Value | Meaning |
|--------|-------|-------|-------|---------|
| 0-1 | `0001` | Version | 1 | Current version |
| 2-3 | `0000` | ChainType | 0x0000 | EVM (eip155) |
| 4 | `01` | ChainRefLen | 1 | ChainRef is 1 byte |
| 5 | `01` | ChainRef | 1 | Ethereum mainnet |
| 6 | `14` | AddrLen | 20 | Address is 20 bytes |
| 7-26 | `d8da...` | Address | - | 20-byte EVM address |

**Total**: 2 + 2 + 1 + ChainRefLen + 1 + AddrLen bytes

## Building for different chains

**Ethereum mainnet (chain ID 1)**:
```
0x0001 + 0000 + 01 + 01 + 14 + [20 bytes] = 26 bytes
```

**Base (chain ID 8453 = 0x2105)**:
```
0x0001 + 0000 + 02 + 2105 + 14 + [20 bytes] = 28 bytes
```

**Solana mainnet (32-byte address, 32-byte genesis hash)**:
```
0x0001 + 0002 + 20 + [32-byte genesis] + 20 + [32-byte address] = 70 bytes
```

## Valid
- ✅ `0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045` → Ethereum mainnet (chainRef=0x01)
- ✅ `0x0001000002210514d8da6bf26964af9d7eed9e03e53415d37aa96045` → Base (chainRef=0x2105)
- ✅ `0x00010000000014d8da6bf26964af9d7eed9e03e53415d37aa96045` → Any EVM chain (ChainRefLen=0)
- ✅ `0x00010002200014...` → Solana chain identifier only (AddrLen=0)

## Invalid
- ❌ `0xd8da6bf26964af9d7eed9e03e53415d37aa96045` → raw address, no chain context
- ❌ `0x00010000000000` → both lengths are zero
- ❌ `0x00020000010114...` → Version 2 doesn't exist

## Why binary instead of CAIP-10?

CAIP-10 uses text format: `eip155:1:0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`

| Aspect | Interoperable Address | CAIP-10 String |
|--------|----------------------|----------------|
| **Size (ETH mainnet)** | 26 bytes | 51 bytes |
| **Size (Base)** | 27 bytes | 54 bytes |
| **On-chain parsing** | Direct field access | String parsing required |
| **Canonicity** | Defined by CAIP-350 profiles | Not enforced |
| **Chain reference** | Full-length (no truncation) | Limited to 32 chars |
| **Use case** | Smart contracts | APIs, databases, logs |

**Key limitations of CAIP-10** (from ERC-7930):
- Does NOT define serialization/deserialization rules for target addresses
- 32-character limit on chain reference can cause lossy representation (e.g., Solana uses truncated genesis hash)
- Strings are inefficient for on-chain storage

**Rule**: Use Interoperable Address for on-chain, CAIP-10 or Interoperable Name for off-chain.

## Versioning rules for future versions

Future versions of this standard (from ERC-7930):
- **MUST** be trivially convertible to Version 1 format
- **MUST** set most significant bit of Version to 1 if NOT backward-compatible with parsing rules
- **MUST** support defining an address, a chain, or both
- **MAY** add fields but **MUST NOT** alter or omit data required to reconstruct Version 1 exactly
- **MAY** only represent a subset of CAIP namespaces

## Not to confuse with
- **Interoperable Name**: Text format (`addr@chain#checksum`), for humans, converts to/from this
- **Target Address**: The raw address component inside this structure
- **CAIP-10**: Text format (`eip155:1:0xd8dA...`), similar purpose but not optimized for on-chain

## References
- [ERC-7930](https://eips.ethereum.org/EIPS/eip-7930)
