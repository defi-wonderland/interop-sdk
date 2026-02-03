---
title: Parsing and Building Guide
impact: PRACTICAL
tags: erc-7930, parsing, implementation
---

# Parsing and Building Guide

Step-by-step instructions for parsing and constructing Interoperable Addresses.

## Parsing (binary → components)

```python
def parse_interop_address(data: bytes) -> dict:
    # Minimum length check
    if len(data) < 6:
        raise Error("Too short")

    # Field extraction
    version = int.from_bytes(data[0:2], 'big')      # 2 bytes
    chain_type = int.from_bytes(data[2:4], 'big')   # 2 bytes
    chain_ref_len = data[4]                          # 1 byte

    chain_ref = data[5 : 5 + chain_ref_len]          # variable

    addr_len_offset = 5 + chain_ref_len
    addr_len = data[addr_len_offset]                 # 1 byte

    addr_offset = addr_len_offset + 1
    address = data[addr_offset : addr_offset + addr_len]  # variable

    # Validation
    if version != 1:
        raise Error("Invalid version")
    if chain_ref_len == 0 and addr_len == 0:
        raise Error("Both lengths cannot be zero")
    if len(data) != addr_offset + addr_len:
        raise Error("Length mismatch")

    return {
        "version": version,
        "chain_type": chain_type,
        "chain_ref": chain_ref,
        "address": address
    }
```

## Building (components → binary)

```python
def build_interop_address(
    chain_type: int,
    chain_ref: bytes,
    address: bytes
) -> bytes:
    # Validation
    if len(chain_ref) == 0 and len(address) == 0:
        raise Error("At least one must be non-empty")
    if len(chain_ref) > 255 or len(address) > 255:
        raise Error("Length exceeds 1 byte")

    return (
        b'\x00\x01' +                           # Version (always 0x0001)
        chain_type.to_bytes(2, 'big') +         # ChainType
        len(chain_ref).to_bytes(1, 'big') +     # ChainRefLen
        chain_ref +                              # ChainRef
        len(address).to_bytes(1, 'big') +       # AddrLen
        address                                  # Address
    )
```

## Common chain configurations

| Chain | ChainType | ChainRef | AddrLen | Total bytes |
|-------|-----------|----------|---------|-------------|
| Ethereum | `0x0000` | `0x01` (1 byte) | 20 | 26 |
| Optimism | `0x0000` | `0x0a` (1 byte) | 20 | 26 |
| Base | `0x0000` | `0x2105` (2 bytes) | 20 | 28 |
| Arbitrum | `0x0000` | `0xa4b1` (2 bytes) | 20 | 28 |
| Polygon | `0x0000` | `0x89` (1 byte) | 20 | 26 |
| Any EVM | `0x0000` | (0 bytes) | 20 | 25 |
| Solana | `0x0002` | 32 bytes genesis | 32 | 70 |

## Checksum calculation

```python
def calculate_checksum(
    chain_type: int,
    chain_ref: bytes,
    address: bytes
) -> str:
    # Version is EXCLUDED from hash
    hash_input = (
        chain_type.to_bytes(2, 'big') +
        len(chain_ref).to_bytes(1, 'big') +
        chain_ref +
        len(address).to_bytes(1, 'big') +
        address
    )

    full_hash = keccak256(hash_input)
    return full_hash[0:4].hex().upper()  # 8 uppercase hex chars
```

## Solidity implementation

```solidity
function parseInteropAddress(bytes calldata data)
    internal pure
    returns (uint16 chainType, bytes memory chainRef, bytes memory addr)
{
    require(data.length >= 6, "Too short");
    require(data[0] == 0x00 && data[1] == 0x01, "Invalid version");

    chainType = uint16(bytes2(data[2:4]));
    uint8 chainRefLen = uint8(data[4]);
    chainRef = data[5:5+chainRefLen];

    uint8 addrLen = uint8(data[5+chainRefLen]);
    addr = data[6+chainRefLen:6+chainRefLen+addrLen];

    require(chainRefLen > 0 || addrLen > 0, "Both lengths zero");
}
```

## References
- [ERC-7930](https://eips.ethereum.org/EIPS/eip-7930)
