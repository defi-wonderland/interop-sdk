---
title: Settlement Interfaces
impact: FOUNDATION
tags: erc-7683, settler, origin, destination
---

# Settlement Interfaces

Contracts that handle order opening, filling, and payment.

## IOriginSettler (origin chain)

```solidity
function openFor(GaslessCrossChainOrder order, bytes signature, bytes originFillerData) external;
function open(OnchainCrossChainOrder order) external;
function resolveFor(GaslessCrossChainOrder order, bytes originFillerData) external view returns (ResolvedCrossChainOrder memory);
function resolve(OnchainCrossChainOrder order) external view returns (ResolvedCrossChainOrder memory);
```
Note: order = calldata

Must emit `Open(bytes32 indexed orderId, ResolvedCrossChainOrder resolvedOrder)` event.

## IDestinationSettler (destination chain)

```solidity
function fill(bytes32 orderId, bytes originData, bytes fillerData) external;
```

## Do
- ✅ Implement both interfaces for a complete settlement system
- ✅ Emit `Open` event with resolved order data
- ✅ Use `originData` from FillInstruction in `fill()` calls

## Don't
- ❌ Forget to emit `Open` event → fillers can't discover orders
- ❌ Modify `originData` between origin and destination → fill validation fails
- ❌ Assume settlement mechanism → ERC-7683 is agnostic to how verification works

## Not to confuse with
- **Filler**: Calls these interfaces, doesn't implement them
- **User**: Calls `open()` directly for OnchainCrossChainOrder

## References
- [ERC-7683](https://eips.ethereum.org/EIPS/eip-7683)
