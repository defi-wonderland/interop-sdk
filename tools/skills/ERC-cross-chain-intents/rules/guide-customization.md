---
title: Customization Options
impact: PRACTICAL
tags: erc-7683, rationale, permit2, dutch-auction
---

# Customization Options

ERC-7683 provides flexibility for implementers to customize behavior within the standard flow.

## Design flexibility

Implementers can customize:

### Price resolution
- **Dutch auctions**: On origin or destination chain
- **Oracle-based pricing**: Use external price feeds
- **Fixed pricing**: Static amounts


### Settlement procedures
- Different verification mechanisms
- Various cross-chain messaging systems

### Action ordering
- Fill can happen BEFORE `open` in some settlement systems
- Flexible sequencing based on implementation needs

## Permit2 integration

Permit2 is not required but provides an efficient approach:

### Benefits
- Single signature for token approval AND order approval
- Couples token transfer with order initiation
- Safer than standard approval model (tokens tied to specific order)

### When using Permit2
- `nonce` should be a permit2 nonce
- `openDeadline` should be the permit2 deadline
- Full order struct (including parsed `orderData`) should be the witness type

### Without Permit2
Requires two separate signatures:
1. Token approval (ERC-2612 permit or on-chain)
2. Order approval signature

This decouples token approval from order, meaning approved tokens could be taken by buggy/untrusted settler.

## The orderData field

The `orderData` field enables arbitrary specifications while still allowing integrators to parse primary fields via `resolve()`.

This motivated the design of:
- `resolve()` / `resolveFor()` view functions
- `ResolvedCrossChainOrder` type

Resolution enables fillers to validate and assess orders without specific knowledge of the `orderData` format.

## References
- [ERC-7683](https://eips.ethereum.org/EIPS/eip-7683) - Rationale section
