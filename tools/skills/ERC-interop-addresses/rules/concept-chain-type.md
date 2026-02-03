---
title: ChainType and ChainReference
impact: FOUNDATION
tags: caip-350, namespace, chain-id
---

# ChainType and ChainReference

How chains are identified in Interoperable Addresses.

- **ChainType**: 2-byte namespace identifier (which blockchain ecosystem)
- **ChainReference**: Variable-length chain identifier within that namespace (which specific chain)

## What is CAIP-350?

CAIP-350 is a **meta-standard** that describes how each blockchain namespace serializes its addresses into the Interoperable Address format. It does NOT define the serialization rules directly—instead, each namespace MUST create a **profile** that specifies:

1. Deterministic conversions between customary text formats and Interoperable Address/Name
2. Exactly ONE 2-byte ChainType identifier (no collisions with other namespaces)
3. Serialization rules for ChainReference and Address within that namespace

Profiles are maintained by the Chain-Agnostic Standards Alliance (CASA) in the [Namespaces Registry](https://github.com/ChainAgnostic/namespaces).

## Do
- ✅ Use ChainType values from CAIP-350 profiles
- ✅ ChainReference can be omitted (length=0) for namespace-wide addresses
- ✅ Refer to namespace profiles for serialization rules

## Don't
- ❌ Invent ChainType values → MUST be registered in CAIP-350
- ❌ Assume ChainReference format → varies by namespace
- ❌ Assume canonicity is guaranteed → some namespaces may have limitations (see Security)

## ChainType values (from CAIP-350 profiles)
- `0x0000` → EVM (eip155)
- `0x0002` → Solana

Full list: Each namespace registers its ChainType in the [CASA Namespaces Registry](https://github.com/ChainAgnostic/namespaces)

## ChainReference examples

### EVM (ChainType = 0x0000)
Chain ID encoded as minimal bytes (no leading zeros):

| Chain | Chain ID | ChainRef bytes | ChainRefLen |
|-------|----------|----------------|-------------|
| Ethereum | 1 | `0x01` | 1 |
| Optimism | 10 | `0x0a` | 1 |
| Polygon | 137 | `0x89` | 1 |
| Base | 8453 | `0x2105` | 2 |
| Arbitrum | 42161 | `0xa4b1` | 2 |

### Solana (ChainType = 0x0002)
ChainRef = 32-byte genesis blockhash identifying the cluster:

| Cluster | Genesis Hash (first 8 bytes shown) |
|---------|-----------------------------------|
| Mainnet | `5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp...` |
| Devnet | `EtWTRABZaYq6iMfeYKouRu166VU2xqa1...` |
| Testnet | `4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z...` |

**Solana address**: 32 bytes (base58-decoded public key)

## Valid
- ✅ ChainType=`0x0000`, ChainRef=`0x01` → Ethereum mainnet
- ✅ ChainType=`0x0000`, ChainRef=`0x2105` → Base (chain ID 8453)
- ✅ ChainType=`0x0000`, ChainRefLen=`0` → any EVM chain (no specific chain)
- ✅ ChainType=`0x0002`, ChainRef=`[32 bytes]` → specific Solana cluster
- ✅ ChainType=`0x0002`, ChainRefLen=`0` → any Solana cluster

## Invalid
- ❌ ChainType=`0x9999` → not registered in CAIP-350
- ❌ ChainType=`0x0000`, ChainRef=`ethereum` → ChainRef must be binary, not text
- ❌ ChainType=`0x0002`, ChainRef=`0x01` → Solana ChainRef must be 32 bytes or empty

## Backwards compatibility with CAIP-2/CAIP-10

CAIP-350 profiles SHOULD clarify which conversions are:

**Problematic** (require extra resources):
- Converting truncated CAIP-2 to full CAIP-350 (e.g., Solana's 32-char genesis hash → full 44-char)
- Clients SHOULD support these but compliance doesn't require it

**Impossible** (cannot be done):
- EVM chain with chainId > 10^32 (CAIP-2's 32-char limit)
- Chain with CAIP-10 defined but no ChainType registered

Client libraries SHOULD produce different errors for these two cases.

## Not to confuse with
- **CAIP-2**: Text format for chain IDs (`eip155:1`), ChainType/ChainRef are binary equivalents
- **Chain label**: ENS label like `ethereum`, used in Interoperable Names, resolves to ChainType+ChainRef

## References
- [CAIP-350](https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-350.md)
- [CASA Namespaces Registry](https://github.com/ChainAgnostic/namespaces)
