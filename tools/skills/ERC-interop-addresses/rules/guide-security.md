---
title: Security Considerations
impact: CRITICAL
tags: security, canonicity, ens, validation
---

# Security Considerations

Security warnings from ERC-7930, ERC-7828, and CAIP-350 that implementers MUST consider.

## Canonicity is NOT guaranteed (ERC-7930, CAIP-350)

The Interoperable Address format aims to provide canonical address representation, but this is a **leaky abstraction**:

- A namespace's CAIP-350 profile might define serialization that can't guarantee canonicity
- A given network might have two valid CAIP-2 identifiers referring to it
- When canonicity is not guaranteed, it SHOULD be noted in the profile's "Extra Considerations" section

**Implication**: If using Interoperable Addresses as keys in smart contract mappings or key-value stores, **thoroughly review the CAIP-350 profile** for the namespace to check for canonicity issues and potential collisions with other namespaces.

## ENS name normalization (ERC-7828)

Implementers MUST follow ENS name normalization specifications to avoid homoglyph and spoofing attacks:

- **ENSIP-1**: Basic normalization rules
- **ENSIP-15**: Extended normalization (UTS-46, confusables)

Example attacks prevented:
- `vitalik.eth` vs `vitаlik.eth` (Cyrillic 'а')
- `example.eth` vs `exampIe.eth` (uppercase 'I' vs lowercase 'l')

## Address poisoning (ERC-7828)

Users should stay vigilant of address poisoning attacks when using raw target addresses in the `<address>` component.

Attack pattern: Attacker creates transactions from addresses that look similar to victim's contacts, hoping victim copies wrong address.

## ENS resolver changes (ERC-7828)

ENS resolution depends on resolver contracts set for each name:
- Resolvers may change over time
- Wildcard resolvers (ENSIP-10) may return dynamic data
- Previously valid Interoperable Names may resolve differently after resolver updates

**Implication**: Checksums for ENS names are SHOULD NOT (not MUST NOT) because:
1. ENS resolution is inherently dynamic
2. A checksum generated today may not validate tomorrow even if resolution is "correct"

## What checksum protects vs what it doesn't

**Checksum DETECTS** (integrity):
- Typos in address or chain ID
- Truncation (missing bytes)
- Corruption during transmission
- Field swap (chain/address bytes mixed)

**Checksum does NOT DETECT** (correctness):
- Wrong address entirely (different valid address has its own valid checksum)
- Phishing addresses (attacker's `0xABC...` has valid checksum `#DEADBEEF`)
- Wrong chain selection (user meant Optimism but typed Ethereum)
- Semantic errors (sending to contract instead of EOA)

**Key insight**: Checksum verifies *integrity* (data wasn't corrupted), not *correctness* (this is the right recipient).

## References
- [ERC-7930 Security Considerations](https://eips.ethereum.org/EIPS/eip-7930#security-considerations)
- [ERC-7828 Security Considerations](https://eips.ethereum.org/EIPS/eip-7828#security-considerations)
- [CAIP-350 Security Considerations](https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-350.md#security-considerations)
- [ENSIP-1](https://docs.ens.domains/ensip/1/) - Basic normalization
- [ENSIP-15](https://docs.ens.domains/ensip/15/) - Extended normalization
