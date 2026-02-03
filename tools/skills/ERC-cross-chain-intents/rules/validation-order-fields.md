---
title: Order Field Validation
impact: CRITICAL
tags: erc-7683, validation, deadlines
---

# Order Field Validation

Required fields and validation rules for cross-chain orders.

## Do
- ✅ `fillDeadline` must be in the future
- ✅ `originSettler` must support the `orderDataType`
- ✅ `nonce` used for replay protection (implementation-specific, see below)

## Don't
- ❌ Accept orders with expired `fillDeadline` → can't be filled
- ❌ Ignore `orderDataType` → can't decode `orderData` correctly

## Valid order (Gasless)
- ✅ `fillDeadline` in the future
- ✅ `originSettler` is valid contract implementing IOriginSettler
- ✅ `orderDataType` matches implementation's expected type

## Invalid order
- ❌ `fillDeadline` in the past → expired
- ❌ `originSettler` doesn't implement IOriginSettler → can't open
- ❌ `orderDataType` unknown to settler → can't decode

## Field differences by order type

GaslessCrossChainOrder has fields not present in OnchainCrossChainOrder:
- `originSettler`, `user`, `nonce`, `originChainId`, `openDeadline`

OnchainCrossChainOrder only has:
- `fillDeadline`, `orderDataType`, `orderData`

## Nonce handling (GaslessCrossChainOrder only)

The `nonce` field is used for replay protection, but ERC-7683 does not specify how it must be validated. Implementation options include:

- **Permit2 nonce**: When using Permit2, the order nonce should be a permit2 nonce

The implementation depends on your settlement system design.

## Addresses format
- `Output.token`, `Output.recipient`, `FillInstruction.destinationSettler` use `bytes32`
- This allows non-EVM addresses (larger than 20 bytes, e.g., Solana uses 32 bytes)

## Special address(0) meanings in Output
- `Output.token = address(0)` → represents the **native token** (ETH, etc.)
- `Output.recipient = address(0)` → filler is unknown at order creation

## References
- [ERC-7683](https://eips.ethereum.org/EIPS/eip-7683)
