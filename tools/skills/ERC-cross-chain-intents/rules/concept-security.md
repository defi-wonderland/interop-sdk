---
title: Security Considerations
impact: FOUNDATION
tags: erc-7683, security, settlement
---

# Security Considerations

Security aspects from ERC-7683 that implementers and users must understand.

## Settlement contract security

ERC-7683 is **agnostic** of how the settlement system validates order fulfillment and refunds fillers.

### Responsibility delegation

The standard delegates security evaluation to:
- **Fillers**: Must evaluate if the settlement contract is trustworthy before filling
- **Applications**: Must evaluate settlement contracts before creating user orders


## Future direction

The ERC hopes to eventually support a dedicated standard for safe, trustless, cross-chain verification systems.

## References
- [ERC-7683](https://eips.ethereum.org/EIPS/eip-7683) - Security Considerations section
