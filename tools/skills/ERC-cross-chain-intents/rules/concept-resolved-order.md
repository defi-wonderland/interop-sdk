---
title: ResolvedCrossChainOrder
impact: FOUNDATION
tags: erc-7683, resolved, filler
---

# ResolvedCrossChainOrder

Generic order representation for fillers. Both order types resolve to this.

Fields:
- `user`: Who initiated the transfer
- `originChainId`: Source chain
- `openDeadline`: When order must be opened
- `fillDeadline`: When order must be filled
- `orderId`: Unique identifier for this order within this settlement system
- `maxSpent`: Max outputs filler will send (cap on filler liability). Actual amount may depend on destination chain state.
- `minReceived`: Min outputs filler must receive (floor on filler receipts)
- `fillInstructions`: Array of instructions for each leg of the fill

## FillInstruction structure
- `destinationChainId`: The chain that this instruction is intended to be filled on
- `destinationSettler`: The contract address that the instruction is intended to be filled on (bytes32)
- `originData`: Data generated on the origin chain needed by the destinationSettler to process the fill

## originData is opaque

The `originData` field is completely opaque. This opaqueness allows settler implementations to freely customize the data they transmit. Fillers do not need to interpret this information.

## Do
- ✅ Use `resolve()` or `resolveFor()` to get this from raw orders
- ✅ Check `maxSpent` before filling → your liability cap
- ✅ Iterate `fillInstructions` for multi-leg fills

## Don't
- ❌ Assume single destination → orders can have multiple legs
- ❌ Ignore `originData` → needed for valid fill
- ❌ Modify `originData` → must pass through as-is

## Not to confuse with
- **GaslessCrossChainOrder / OnchainCrossChainOrder**: Input formats that resolve TO this
- **Output**: Component struct for token amounts and recipients

## References
- [ERC-7683](https://eips.ethereum.org/EIPS/eip-7683)
