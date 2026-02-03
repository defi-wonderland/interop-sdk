---
title: Order Types
impact: FOUNDATION
tags: erc-7683, orders, gasless, onchain
---

# Order Types

Two ways users can create cross-chain orders.

## GaslessCrossChainOrder
Opens a gasless cross-chain order on behalf of a user. To be called by the filler.
User signs off-chain, filler calls `openFor()` on-chain.

Fields:
- `originSettler`: Contract to settle the order
- `user`: Who's sending tokens
- `nonce`: Replay protection
- `originChainId`: Source chain
- `openDeadline`: The timestamp by which the order must be opened
- `fillDeadline`: The timestamp by which the order must be filled on the destination chain
- `orderDataType`: EIP-712 typehash for orderData
- `orderData`: Implementation-specific data (can be used to define tokens, amounts, destination chains, fees, settlement parameter, or any other order-type specific information)

## OnchainCrossChainOrder
Opens a cross-chain order. To be called by the user.
User calls `open()` directly on-chain.

Fields:
- `fillDeadline`: When order must be filled on the destination chain(the timestamp)
- `orderDataType`: EIP-712 typehash for orderData
- `orderData`: Implementation-specific data (can be used to define tokens, amounts, destination chains, fees, settlement parameter, or any other order-type specific information)

## Do
- ✅ Use GaslessCrossChainOrder when filler opens order on behalf of user
- ✅ Use OnchainCrossChainOrder when user opens order directly
- ✅ Always include fillDeadline

## Don't
- ❌ Mix up openDeadline and fillDeadline. This are different things

## Not to confuse with
- **ResolvedCrossChainOrder**: Generic representation AFTER resolution, not the input format

## References
- [ERC-7683](https://eips.ethereum.org/EIPS/eip-7683)
