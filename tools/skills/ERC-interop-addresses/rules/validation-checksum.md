---
title: Checksum Validation
impact: CRITICAL
tags: erc-7828, checksum, integrity
---

# Checksum Validation

How to calculate and validate checksums for Interoperable Names.

Checksum = first 4 bytes (8 hex chars) of Keccak-256 hash.

## Do
- ✅ Hash these fields IN ORDER: ChainType + ChainRefLength + ChainRef + AddressLength + Address
- ✅ Display as uppercase hex (e.g., `#4CA88C9C`)
- ✅ Include checksum for raw addresses (recommended)

## Don't
- ❌ Include Version field in hash → explicitly excluded
- ❌ Include checksum for ENS names → resolution is dynamic, checksum would break
- ❌ Assume valid checksum = correct address → only verifies integrity, not correctness

## Calculation
```
hash_input = ChainType || ChainRefLength || ChainRef || AddressLength || Address
checksum = keccak256(hash_input)[0:4].toUpperHex()
```

## Example: Ethereum mainnet address

For `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1`:

```
ChainType     = 0x0000        (EVM)
ChainRefLen   = 0x01          (1 byte)
ChainRef      = 0x01          (chain ID 1)
AddrLen       = 0x14          (20 bytes)
Address       = d8da6bf26964af9d7eed9e03e53415d37aa96045

hash_input    = 0x00000101 14 d8da6bf26964af9d7eed9e03e53415d37aa96045
checksum      = keccak256(hash_input)[0:4] = 4CA88C9C
```

## What checksum DETECTS vs does NOT DETECT

| Detects (integrity) | Does NOT detect (correctness) |
|---------------------|-------------------------------|
| Typos in address/chain | Wrong address entirely |
| Truncation | Phishing addresses |
| Transmission corruption | Wrong chain selection |
| Field swaps | Semantic errors (contract vs EOA) |

**Key insight**: Checksum verifies *integrity* (data wasn't corrupted), not *correctness* (this is the right recipient).

See `guide-security` for detailed security implications.

## Valid
- ✅ `0xd8dA...@eip155:1#4CA88C9C` → checksum matches calculated value
- ✅ `0xd8dA...@ethereum` → no checksum, still valid (optional)

## Invalid
- ❌ `0xd8dA...@eip155:1#00000000` → checksum doesn't match
- ❌ `0xd8dA...@eip155:1#4ca88c9c` → lowercase not allowed (BNF syntax: `[0-9A-F]{8}` requires uppercase)
- ❌ `vitalik.eth@ethereum#ABCD1234` → checksum on ENS name (not recommended)

## References
- [ERC-7828](https://eips.ethereum.org/EIPS/eip-7828)
