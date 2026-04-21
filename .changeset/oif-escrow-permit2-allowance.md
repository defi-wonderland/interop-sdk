---
"@wonderland/interop-cross-chain": patch
---

The OIF adapter now surfaces Permit2 allowances for `oif-escrow-v0` quotes. The EIP-712 payload is parsed and a `checks.allowances` entry is added pointing at the canonical Permit2 address, so the approval service prepends the required `approve(PERMIT2, ...)` automatically instead of the first transfer silently failing. All four Permit2 primaryTypes are handled; anything else is ignored with a warning.

If your app accepts Permit2-based gasless flows, pair the approval service with `InfiniteAmountStrategy`. Permit2 consumes the ERC-20 allowance on every pull, so approving only the exact amount forces another approve before each order.
