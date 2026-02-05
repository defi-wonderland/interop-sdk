---
name: interop-addresses
description: Use when working with chain-specific addresses, Interoperable Addresses (ERC-7930), Interoperable Names (ERC-7828), or CAIP-350 chain identifiers.
user-invocable: true
disable-model-invocation: false
---

# Interoperable Addresses

## Motivation

The address format used on Ethereum mainnet (ERC-55) is shared by many blockchains but **does not encode chain information**. With hundreds of L2s sharing the same address format, an address alone is insufficient to determine which chain it targets—funds can be sent to an unreachable address on the wrong chain.

These standards solve this:
- **ERC-7930**: Compact binary format for on-chain use (smart contracts, message passing)
- **ERC-7828**: Human-readable text format for user-facing interactions
- **CAIP-350**: Meta-standard defining how each blockchain namespace serializes addresses

## When to use

- Working with addresses that need chain context (cross-chain scenarios)
- Converting between binary and text address formats
- Validating chain-specific address structures
- Implementing ERC-7930, ERC-7828, or CAIP-350

## Key concepts

| Term | Format | Use case |
|------|--------|----------|
| **Interoperable Address** | Binary (`0x00010000010114d8da...`) | On-chain, smart contracts |
| **Interoperable Name** | Text (`addr@chain#checksum`) | Human-readable, UIs |
| **Target Address** | Raw (`0xd8dA6BF...`) | No chain context |
| **ChainType** | 2 bytes (`0x0000` = EVM) | Namespace identifier |
| **ChainReference** | Variable | Specific chain in namespace |

## Standards relationship

```
┌─────────────────────────────────────────────────────────────────┐
│                         CAIP-350                                │
│              (Namespace profiles - Living)                      │
│         Defines ChainType + serialization per namespace         │
└─────────────────────┬───────────────────────────────────────────┘
                      │ defines profiles for
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                        ERC-7930                                 │
│               Interoperable Address (Binary)                    │
│                    Canonical format                             │
└─────────────────────┬───────────────────────────────────────────┘
                      │ derives from (requires: 7930)
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                        ERC-7828                                 │
│                Interoperable Name (Text)                        │
│                  Human-readable layer                           │
└─────────────────────────────────────────────────────────────────┘
```

| Standard | Depends on | Relationship |
|----------|------------|--------------|
| **ERC-7930** | CAIP-350 | Uses namespace profiles for serialization rules |
| **ERC-7828** | ERC-7930, EIP-155 | Derives from ERC-7930; MUST be convertible to/from binary format |
| **CAIP-350** | CAIP-2, CAIP-10 | Extends chain identification standards |

**Key insight**: ERC-7828 (Interoperable Name) is the human-readable presentation layer of ERC-7930 (Interoperable Address). Both encode the same information—one for machines, one for humans.

## Rules

### Binary format (ERC-7930)
- Version MUST be `0x0001`
- At least one of ChainRefLength or AddressLength MUST be > 0
- Both lengths = 0 is INVALID
- Display as lowercase hex

### Text format (ERC-7828)
- Syntax: `<interoperable-name> ::= <address> "@" <chain> [ "#" <checksum> ]`
- `<chain>` with `:` = CAIP identifier (`eip155:1`)
- `<chain>` without `:` = ENS label (resolves `*.on.eth`)
- `<address>` with `.` = ENS name
- Checksum OPTIONAL but recommended for raw addresses
- Do NOT include checksum for ENS names (resolution is dynamic)

### CAIP-350 profiles
- Each profile MUST define exactly ONE 2-byte ChainType
- Each profile MUST state whether its standard text differs from CAIP-2/CAIP-10
- Chain identifier text format: `<namespace>:<chainReference>`

### Checksum
- Hash: `keccak256(ChainType || ChainRefLen || ChainRef || AddrLen || Address)`
- Version EXCLUDED from hash
- First 4 bytes, uppercase hex (`#4CA88C9C`)
- Verifies INTEGRITY, not CORRECTNESS

### Security
- Canonicity NOT guaranteed for all namespaces - check CAIP-350 profile
- Follow ENS normalization (ENSIP-1, ENSIP-15) to prevent homoglyph attacks
- ENS resolvers may change over time

## Implementation Guidelines

### Follow specs precisely
- Implementations MUST enable "competing, interoperable implementations" (EIP-1)
- RFC 2119 keywords (MUST, SHOULD, MAY) have normative meaning - follow them exactly
- When in doubt, prefer the spec's exact behavior over convenience

### Handle edge cases
- Both lengths = 0 is INVALID (explicit edge case)
- ChainRefLen = 0 with AddressLen > 0 is VALID (any chain in namespace)
- AddressLen = 0 with ChainRefLen > 0 is VALID (network without address)
- Check CAIP-350 "Extra Considerations" for namespace-specific edge cases

### Reference implementations
- We build reference implementations following the spec precisely
- Developer affordances (helper functions, better errors) MAY be added beyond 1:1 spec interface
- Affordances must NOT change the underlying spec behavior

### When you find ambiguity
- **Highlight it to the user** before proceeding
- Check if the ambiguity is documented in "Known ambiguities" below
- If new ambiguity found, consider opening an issue on the ERC repo

## Where to find updates

- **ERCs**: [ethereum/ERCs](https://github.com/ethereum/ERCs), [ethereum/EIPs](https://github.com/ethereum/EIPs)
- **CAIPs**: [ChainAgnostic/CAIPs](https://github.com/ChainAgnostic/CAIPs)
- **Namespace profiles**: [ChainAgnostic/namespaces](https://github.com/ChainAgnostic/namespaces)

**Status**: ERC-7930 and ERC-7828 are **Draft** (subject to change). CAIP-350 is **Living** (profiles added over time).

**Important**: Always check for updates to namespace profiles when working with new chains.

## Known ambiguities

- Some namespaces may not guarantee address canonicity (noted in CAIP-350 "Extra Considerations")
- A network may have multiple valid CAIP-2 identifiers
- ENS wildcard resolvers (ENSIP-10) may return dynamic data
- Checksum validation behavior when ENS resolver changes is undefined

## Response Guidelines

When answering questions, always include the direct link to the specific standard:

| Standard | Direct Link |
|----------|-------------|
| ERC-7930 | https://github.com/ethereum/ERCs/blob/master/ERCS/erc-7930.md |
| ERC-7828 | https://github.com/ethereum/ERCs/blob/master/ERCS/erc-7828.md |
| EIP-1 | https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1.md |
| EIP-155 | https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md |
| CAIP-350 | https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-350.md |
| CAIP-2 | https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md |
| CAIP-10 | https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-10.md |
| Namespace profiles | https://github.com/ChainAgnostic/namespaces |

**Link format pattern**:
- ERCs: `https://github.com/ethereum/ERCs/blob/master/ERCS/erc-{number}.md`
- EIPs: `https://github.com/ethereum/EIPs/blob/master/EIPS/eip-{number}.md`
- CAIPs: `https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-{number}.md`

Example response format:
> "The checksum is calculated using keccak256... You can find the full specification in [ERC-7828](https://github.com/ethereum/ERCs/blob/master/ERCS/erc-7828.md)"

## Reference

See `references/reference.md` for detailed explanations and code.
