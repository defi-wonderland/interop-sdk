---
"@wonderland/interop-cross-chain": patch
---

Across: validate quote target against the canonical SpokePool registry and reject calldata that is not a SpokePool `deposit` or that carries a non-empty destination message. Quotes for chains absent from the registry fail closed.
