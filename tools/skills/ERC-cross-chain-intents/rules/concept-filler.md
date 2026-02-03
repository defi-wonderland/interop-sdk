---
title: Filler
impact: FOUNDATION
tags: erc-7683, filler, execution
---

# Filler

Entity that executes user intents on destination chain(s) and receives payment.

## Flow (Gasless)
1. User signs GaslessCrossChainOrder off-chain
2. Order is disseminated to fillers
3. Filler calls `resolveFor()` to understand requirements
4. Filler calls `openFor()` on origin chain
5. Filler calls `fill()` on destination chain(s)
6. Settlement process pays filler

## Flow (Onchain)
1. User calls `open()` directly
2. Filler reads `Open` event
3. Filler calls `fill()` on destination chain(s)
4. Settlement process pays filler

## Do
- ✅ Call `resolve()`/`resolveFor()` to validate and assess orders
- ✅ Check `maxSpent` vs `minReceived` for profitability
- ✅ Fill ALL legs in `fillInstructions` for complete fill

## Don't
- ❌ Ignore `fillDeadline` → order expires, fill becomes invalid

## Not to confuse with
- **User**: Creates the intent, filler executes it
- **Settler**: Contract that manages settlement, filler interacts with it

## References
- [ERC-7683](https://eips.ethereum.org/EIPS/eip-7683)
