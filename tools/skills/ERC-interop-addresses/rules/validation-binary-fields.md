---
title: Binary Field Validation
impact: CRITICAL
tags: erc-7930, validation, structure
---

# Binary Field Validation

Rules for validating Interoperable Address binary fields.

## Do
- ✅ Version MUST be `0x0001` (current version)
- ✅ At least one of ChainRefLength or AddressLength MUST be > 0
- ✅ Lengths MUST match actual data lengths

## Don't
- ❌ Use Version other than `0x0001` → undefined behavior
- ❌ Set ChainRefLength=0 AND AddressLength=0 → invalid, represents nothing
- ❌ Trust length fields without validating actual data → buffer overflows

## Valid
- ✅ `0x0001` + `0x0000` + `0x01` + `0x01` + `0x14` + `[20 bytes]` → Version 1, EVM, 1-byte chainref, 20-byte address
- ✅ `0x0001` + `0x0000` + `0x00` + `0x14` + `[20 bytes]` → No chainref (length=0), but has address
- ✅ `0x0001` + `0x0002` + `0x20` + `[32 bytes]` + `0x00` → Solana chain, no address (length=0)

## Invalid
- ❌ `0x0002...` → Version 2 not defined
- ❌ `0x0001` + `0x0000` + `0x00` + `0x00` → both lengths zero
- ❌ `0x0001` + `0x0000` + `0x14` + `[10 bytes]` → length says 20, only 10 bytes present

## References
- [ERC-7930](https://eips.ethereum.org/EIPS/eip-7930)
