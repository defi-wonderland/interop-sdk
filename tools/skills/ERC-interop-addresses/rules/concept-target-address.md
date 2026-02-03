---
title: Target Address
impact: FOUNDATION
tags: address, raw, component
---

# Target Address

The raw address itself, without any chain context. It's the "Address" component inside an Interoperable Address.

## Do
- ✅ Use when chain context is already known/implied
- ✅ Serialize according to CAIP-350 rules for the namespace
- ✅ Understand it's ambiguous alone in cross-chain contexts

## Don't
- ❌ Use alone in cross-chain scenarios → which chain is it?
- ❌ Assume same address = same entity across chains → different chains, different owners

## Valid
- ✅ `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` → valid EVM target address (20 bytes)
- ✅ `MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2` → valid Solana target address (32 bytes)

## Invalid
- ❌ `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@ethereum` → this is an Interoperable Name, not target address
- ❌ `d8dA6BF26964aF9D7eEd9e03E53415D37aA96045` → missing `0x` prefix for EVM

## Not to confuse with
- **Interoperable Address**: Binary format that CONTAINS the target address + chain context
- **Interoperable Name**: Text format that CONTAINS the target address + chain context

## References
- [ERC-7930](https://eips.ethereum.org/EIPS/eip-7930) (terminology section)
