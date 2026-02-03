---
title: fillerData and Sub-types
impact: FOUNDATION
tags: erc-7683, fillerdata, subtypes
---

# fillerData and originFillerData

Two filler-defined data fields exist in the interfaces.

## originFillerData (origin chain)

Used in `openFor()` and `resolveFor()`:
```solidity
function openFor(GaslessCrossChainOrder order, bytes signature, bytes originFillerData) external;
function resolveFor(GaslessCrossChainOrder order, bytes originFillerData) external view;
```

Definition from ERC: "Any filler-defined data required by the settler"

## fillerData (destination chain)

Used in `fill()`:
```solidity
function fill(bytes32 orderId, bytes originData, bytes fillerData) external;
```

Definition from ERC: "Data provided by the filler to inform the fill or express their preferences"

## Purpose

Cross-chain execution systems SHOULD use a sub-type that can be parsed from `fillerData`. This may include information such as:

- The desired timing of payment for the filler
- The form of payment for the filler

## Sub-type registration

All sub-types SHOULD be registered in a subtypes repository to encourage sharing based on functionality.

This applies to both:
- `orderData` sub-types (user preferences)
- `fillerData` sub-types (filler preferences)

## Do
- ✅ Define a sub-type for your `fillerData` if you need custom behavior
- ✅ Register sub-types in the repository for interoperability
- ✅ Document your sub-type structure for other integrators

## Don't
- ❌ Assume `fillerData` format without checking settler documentation
- ❌ Ignore `fillerData` in your settler implementation if it's needed

## References
- [ERC-7683](https://eips.ethereum.org/EIPS/eip-7683) - Section "fillerData"
